"""
SynthesisOrchestrator - Refactored with code review fixes
Addresses: connection leaks, code duplication, error handling, timeouts
"""
import json
import logging
import asyncio
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy import select, and_
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.hashing import compute_job_hash
from app.models.job import ResearchJob, JobStatus
from app.services.agents import RecoveryAgent
from app.services.versioning import VersioningService

logger = logging.getLogger(__name__)


class SynthesisError(Exception):
    """Custom exception for synthesis failures with context."""
    def __init__(self, message: str, stage: str = "ERROR", original_error: Optional[Exception] = None):
        super().__init__(message)
        self.stage = stage
        self.original_error = original_error


class SynthesisOrchestrator:
    """
    Orchestrates research synthesis jobs with async worker support and sync fallback.

    Features:
    - Caches completed jobs by content hash
    - Queues jobs to Redis-backed workers
    - Falls back to sync execution if worker unavailable
    - Whiteboard validation with auto-creation
    """

    # Configuration constants
    PROMPT_VERSION = "2.0.0"
    WORKER_TIMEOUT_SECONDS = 45
    MAX_JOB_TIMEOUT_SECONDS = 300  # 5 minutes max for any job
    REDIS_CONN_TIMEOUT = 2
    REDIS_CONN_RETRIES = 1

    def __init__(self):
        self.recovery_agent = RecoveryAgent()
        self._redis_pool = None  # Lazy initialized, reused
        self.redis_settings = self._build_redis_settings()

    def _build_redis_settings(self) -> RedisSettings:
        """Build Redis settings from environment configuration."""
        try:
            if settings.REDIS_URL:
                # Parse URL: redis://host:port/db
                url_part = settings.REDIS_URL.split("://")[1]
                host = url_part.split(":")[0]
                port = int(url_part.split(":")[-1].split("/")[0])
            else:
                host, port = "localhost", 6379
        except (IndexError, ValueError) as e:
            logger.warning(f"Failed to parse REDIS_URL, using defaults: {e}")
            host, port = "localhost", 6379

        return RedisSettings(
            host=host,
            port=port,
            conn_timeout=self.REDIS_CONN_TIMEOUT,
            conn_retries=self.REDIS_CONN_RETRIES
        )

    async def _get_redis_pool(self):
        """Get or create Redis connection pool with health check."""
        if self._redis_pool is None:
            try:
                self._redis_pool = await create_pool(self.redis_settings)
                logger.info("Created new Redis connection pool")
            except Exception as e:
                logger.warning(f"Failed to create Redis pool: {e}")
                raise

        # Health check
        try:
            # Simple ping to verify connection is alive
            await asyncio.wait_for(self._redis_pool.ping(), timeout=1.0)
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"Redis pool health check failed: {e}, recreating pool")
            try:
                await self._redis_pool.close()
            except Exception:
                pass
            self._redis_pool = None
            return await self._get_redis_pool()  # Retry once

        return self._redis_pool

    async def cleanup(self):
        """Call this on application shutdown to close the Redis pool."""
        if self._redis_pool:
            try:
                await self._redis_pool.close()
                self._redis_pool = None
                logger.info("Redis pool closed on shutdown")
            except Exception as e:
                logger.error(f"Error closing Redis pool on shutdown: {e}")

    async def _run_sync_fallback(
        self,
        job_id: str,
        query: str,
        context: str,
        source_map: Dict[str, Any],
        edges: List[Dict[str, Any]],
        reason: str = "Worker unavailable"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run synthesis synchronously when worker is unavailable.
        Uses the same robust agents as the background worker.
        """
        from app.services.agents import PlannerAgent, WriterAgent, BibNormalizerAgent

        yield {
            "stage": "Planning",
            "status": "IN_PROGRESS",
            "message": f"{reason}. Running synthesis synchronously...",
            "progress": 10
        }

        try:
            # 1. Planning
            planner = PlannerAgent()
            # Convert edges to relations string for planner
            rel_parts = []
            for edge in edges:
                source_title = source_map.get(edge.get('source'), {}).get('title', edge.get('source'))
                target_title = source_map.get(edge.get('target'), {}).get('title', edge.get('target'))
                label = edge.get('label', 'connected to')
                rel_parts.append(f"- {source_title} -> {target_title} ({label})")
            rel_context = "\n".join(rel_parts)

            plan_resp = await planner.plan(query, context, rel_context)
            if plan_resp.status != "success":
                raise SynthesisError(f"Planning failed: {plan_resp.reasoning}", stage="Planning")

            yield {
                "stage": "Writing", "status": "IN_PROGRESS",
                "message": "Generating document AST...", "progress": 40
            }

            # 2. Writing
            writer = WriterAgent()
            references_json = json.dumps([
                {"id": ref_id, "title": data.get("title", "Source"), "url": data.get("url", "")}
                for ref_id, data in source_map.items()
            ])
            write_resp = await writer.write(query, context, plan_resp.data, references_json)
            if write_resp.status != "success":
                raise SynthesisError(f"Writing failed: {write_resp.reasoning}", stage="Writing")

            ast_dict = write_resp.data

            # 3. Bib Normalization (Optional but improves quality)
            bib_agent = BibNormalizerAgent()
            bib_resp = await bib_agent.normalize(ast_dict, list(source_map.values()))
            if bib_resp.status == "success":
                ast_dict["references"] = bib_resp.data.get("normalized_references", ast_dict.get("references", []))

            # Update job record with result
            async with SessionLocal() as update_db:
                job_update = await update_db.execute(
                    select(ResearchJob).where(ResearchJob.id == job_id)
                )
                job_record = job_update.scalar_one_or_none()
                if job_record:
                    job_record.status = JobStatus.COMPLETED
                    job_record.output_ast = ast_dict
                    job_record.progress = 100
                    await update_db.commit()

            yield {
                "stage": "Ready",
                "status": "COMPLETED",
                "message": "Synthesis complete (sync mode).",
                "document": ast_dict,
                "progress": 100
            }
        except Exception as e:
            logger.error(f"Synchronous synthesis failed: {e}", exc_info=True)
            yield {
                "status": "FAILED",
                "stage": "ERROR",
                "message": f"Synthesis failed: {str(e)}",
                "progress": 100
            }
            # Record failure in DB
            async with SessionLocal() as db:
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one_or_none()
                if job:
                    job.status = JobStatus.FAILED
                    await db.commit()

    async def _validate_whiteboard(
        self,
        db,
        whiteboard_id: str,
        user_id: Any
    ) -> Optional[str]:
        """
        Validate whiteboard exists for user, or create/find a fallback.
        Returns the valid whiteboard_id or None on failure.
        """
        from app.models.whiteboard import Whiteboard

        # Check if provided whiteboard exists
        wb_check = await db.execute(
            select(Whiteboard).where(
                Whiteboard.id == whiteboard_id,
                Whiteboard.user_id == user_id
            )
        )
        if wb_check.scalar_one_or_none():
            return whiteboard_id

        # Fallback: get any existing whiteboard for user
        any_wb = await db.execute(
            select(Whiteboard).where(Whiteboard.user_id == user_id).limit(1)
        )
        existing_wb = any_wb.scalar_one_or_none()
        if existing_wb:
            logger.info(f"Whiteboard {whiteboard_id} not found, using {existing_wb.id}")
            return existing_wb.id

        # Last resort: create new whiteboard
        try:
            new_wb = Whiteboard(
                id=f"default-{uuid.uuid4().hex[:8]}",
                name="My First Whiteboard",
                user_id=user_id
            )
            db.add(new_wb)
            await db.flush()
            logger.info(f"Created fallback whiteboard {new_wb.id} for user {user_id}")
            return new_wb.id
        except Exception as e:
            logger.error(f"Failed to create fallback whiteboard: {e}")
            return None

    async def _claim_job_for_sync(self, job_id: str) -> bool:
        """
        Attempt to claim a job for synchronous execution.
        Returns True if successfully claimed, False if already claimed by worker.
        """
        async with SessionLocal() as db:
            try:
                job = await db.execute(
                    select(ResearchJob).where(ResearchJob.id == job_id)
                )
                job_record = job.scalar_one_or_none()

                if not job_record:
                    return False

                # Only claim if still in IDLE state (not yet processed by worker)
                if job_record.status == JobStatus.IDLE:
                    job_record.status = JobStatus.PLANNING
                    job_record.metadata_ = job_record.metadata_ or {}
                    job_record.metadata_['execution_mode'] = 'sync_fallback'
                    job_record.metadata_['claimed_at'] = datetime.utcnow().isoformat()
                    await db.commit()
                    logger.info(f"Successfully claimed job {job_id} for sync execution")
                    return True
                else:
                    logger.info(f"Job {job_id} already claimed (status: {job_record.status})")
                    return False

            except Exception as e:
                await db.rollback()
                logger.error(f"Error claiming job: {e}")
                return False

    async def execute(
        self,
        query: str,
        context: str,
        source_map: Dict[str, Any],
        edges: List[Dict[str, Any]],
        user_id: Any,
        whiteboard_id: str,
        parent_job_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute the synthesis pipeline.

        Flow:
        1. Compute input hash for caching
        2. Validate/create whiteboard
        3. Check cache for existing result
        4. Create job record
        5. Enqueue to worker (or sync fallback)
        6. Stream progress via pub/sub
        """
        redis = None
        pubsub = None
        job_id = str(uuid.uuid4())

        try:
            # ... (Lines 211-270 omitted for brevity in diff, assume unchanged) ...
            # 1. Compute content hash for caching
            selected_nodes = list(source_map.values())
            input_hash = compute_job_hash(query, selected_nodes, [], edges, self.PROMPT_VERSION)

            async with SessionLocal() as db:
                try:
                    # 2. Validate whiteboard
                    validated_whiteboard_id = await self._validate_whiteboard(db, whiteboard_id, user_id)
                    if validated_whiteboard_id is None:
                        yield {
                            "status": "FAILED",
                            "stage": "ERROR",
                            "message": "No valid whiteboard found."
                        }
                        return
                    whiteboard_id = validated_whiteboard_id

                    # 3. Check cache
                    cached_job = await db.execute(
                        select(ResearchJob).where(
                            and_(
                                ResearchJob.prompt_hash == input_hash,
                                ResearchJob.status == JobStatus.COMPLETED
                            )
                        ).order_by(ResearchJob.created_at.desc())
                    )
                    cached = cached_job.scalar_one_or_none()

                    if cached:
                        logger.info(f"Cache hit for hash {input_hash[:16]}...")
                        yield {
                            "stage": "Ready",
                            "status": "COMPLETED",
                            "message": "Using cached synthesis result.",
                            "document": cached.output_ast
                        }
                        return

                    # 4. Create job record
                    version = "v1.0.0"
                    if parent_job_id:
                        version = await VersioningService.create_new_version_job(db, parent_job_id)

                    new_job = ResearchJob(
                        id=job_id,
                        user_id=user_id,
                        whiteboard_id=whiteboard_id,
                        parent_job_id=parent_job_id,
                        status=JobStatus.IDLE,
                        prompt_hash=input_hash,
                        document_version=version,
                        query=query,
                        input_payload={
                            "context": context,
                            "source_map": source_map,
                            "edges": edges
                        }
                    )
                    db.add(new_job)
                    await db.commit()
                    logger.info(f"Created new job {job_id} for synthesis")

                except Exception as e:
                    await db.rollback()
                    logger.error(f"Database error during job setup: {e}", exc_info=True)
                    yield {
                        "status": "FAILED",
                        "stage": "ERROR",
                        "message": f"Failed to create job: {str(e)}"
                    }
                    return

            # 5. Enqueue to worker
            try:
                redis = await self._get_redis_pool()
                await redis.enqueue_job('run_synthesis_pipeline', job_id)
            except Exception as e:
                logger.warning(f"Redis unavailable: {e}. Using sync fallback.")
                # Close redis if partially connected
                if redis:
                    try:
                        await redis.close()
                    except Exception:
                        pass
                    redis = None

                # Run sync fallback
                async for step in self._run_sync_fallback(
                    job_id, query, context, source_map, edges,
                    reason="Redis unavailable"
                ):
                    yield step
                return

            # 6. Stream progress via Pub/Sub
            pubsub = redis.pubsub()
            await pubsub.subscribe(f"job_updates:{job_id}")

            first_message_received = False
            job_start_time = asyncio.get_event_loop().time()
            wait_start_time = job_start_time
            last_successful_read = job_start_time
            consecutive_errors = 0
            MAX_CONSECUTIVE_ERRORS = 5
            PUBSUB_HEALTH_TIMEOUT = 30

            while True:
                current_time = asyncio.get_event_loop().time()

                # Check max job timeout
                if current_time - job_start_time > self.MAX_JOB_TIMEOUT_SECONDS:
                    logger.error(f"Job {job_id} exceeded max timeout of {self.MAX_JOB_TIMEOUT_SECONDS}s")
                    yield {
                        "status": "FAILED",
                        "stage": "ERROR",
                        "message": "Job timed out. Please try again."
                    }
                    break

                # Check worker timeout (only before first message)
                if not first_message_received and (current_time - wait_start_time > self.WORKER_TIMEOUT_SECONDS):
                    logger.warning(f"No worker response in {self.WORKER_TIMEOUT_SECONDS}s")

                    # Attempt to claim the job before running sync
                    if await self._claim_job_for_sync(job_id):
                        logger.info(f"Claimed job {job_id}, running sync fallback")
                        async for step in self._run_sync_fallback(
                            job_id, query, context, source_map, edges,
                            reason="Worker not responding"
                        ):
                            yield step
                        break
                    else:
                        wait_start_time = current_time
                        continue

                # Health check: if no messages for a while, verify connection
                if first_message_received and (current_time - last_successful_read > PUBSUB_HEALTH_TIMEOUT):
                    try:
                        await asyncio.wait_for(redis.ping(), timeout=2.0)
                        last_successful_read = current_time # Reset timer
                    except Exception as health_error:
                        logger.error(f"PubSub health check failed: {health_error}")
                        yield {
                            "status": "FAILED",
                            "stage": "ERROR",
                            "message": "Lost connection to job processing system.",
                        }
                        break

                try:
                    # Poll for messages with short timeout
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)

                    if message is None:
                        consecutive_errors = 0
                        continue

                    if message['type'] == 'message':
                        first_message_received = True
                        last_successful_read = current_time
                        consecutive_errors = 0

                        try:
                            data = json.loads(message['data'])
                            yield data

                            status = data.get('status')
                            if status in (JobStatus.COMPLETED, JobStatus.FAILED, 'COMPLETED', 'FAILED'):
                                break
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid JSON in pubsub message: {e}")
                            continue

                except asyncio.TimeoutError:
                    consecutive_errors = 0
                    continue

                except Exception as e:
                    consecutive_errors += 1
                    logger.warning(f"Error reading pubsub message ({consecutive_errors}/{MAX_CONSECUTIVE_ERRORS}): {e}")

                    if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                        logger.error("Too many consecutive pubsub errors, aborting stream")
                        yield {
                            "status": "FAILED",
                            "stage": "ERROR",
                            "message": "Connection to job updates lost."
                        }
                        break

                    await asyncio.sleep(min(consecutive_errors * 0.5, 3.0))


        except Exception as e:
            logger.error(f"Orchestrator error: {e}", exc_info=True)

            # Only close pool on connection errors to force reconnect
            if redis and isinstance(e, (ConnectionError, OSError, asyncio.TimeoutError)):
                try:
                    await redis.close()
                    self._redis_pool = None
                    logger.warning("Closed and reset Redis pool due to connection error")
                except Exception as close_err:
                    logger.debug(f"Error closing redis pool: {close_err}")

            yield {
                "status": "FAILED",
                "stage": "ERROR",
                "message": f"Orchestration failed: {str(e)}"
            }
        finally:
            # Clean up resources
            if pubsub:
                try:
                    await pubsub.unsubscribe(f"job_updates:{job_id}")
                    await pubsub.close()
                except Exception as e:
                    logger.debug(f"Error unsubscribing pubsub: {e}")

            # Do NOT close redis pool here, it is reused.
            # Pool is only closed reset on connection errors above.

    async def run_to_completion(
        self,
        query: str,
        context: str,
        source_map: Dict[str, Any],
        edges: List[Dict[str, Any]],
        user_id: Any,
        whiteboard_id: str,
        parent_job_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Run the pipeline to completion without streaming.
        Returns the final AST document or raises SynthesisError.
        """
        final_doc = None
        async for step in self.execute(
            query, context, source_map, edges, user_id, whiteboard_id, parent_job_id
        ):
            status = step.get("status")
            if step.get("stage") == "Ready" or status in (JobStatus.COMPLETED, 'COMPLETED'):
                final_doc = step.get("document")
            elif status in (JobStatus.FAILED, 'FAILED'):
                raise SynthesisError(
                    step.get("message", "Synthesis failed"),
                    stage=step.get("stage", "ERROR")
                )
        return final_doc


# Singleton instance
orchestrator = SynthesisOrchestrator()
