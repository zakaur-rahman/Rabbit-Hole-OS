"""
SynthesisOrchestrator - Refactored with code review fixes
Addresses: connection leaks, code duplication, error handling, timeouts
"""
import json
import logging
import asyncio
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import select, and_
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.hashing import compute_job_hash
from app.models.job import ResearchJob, JobLog, JobStatus
from app.services.agents import RecoveryAgent
from app.services.versioning import VersioningService

# Configure logger
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
    WORKER_TIMEOUT_SECONDS = 10
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
        """Get or create Redis connection pool."""
        if self._redis_pool is None:
            try:
                self._redis_pool = await create_pool(self.redis_settings)
            except Exception as e:
                logger.warning(f"Failed to create Redis pool: {e}")
                raise
        return self._redis_pool

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
        Extracted to avoid code duplication.
        """
        from app.services.llm import generate_document_ast
        
        yield {
            "stage": "Planning", 
            "status": "IN_PROGRESS", 
            "message": f"{reason}. Running synthesis synchronously...", 
            "progress": 10
        }
        
        try:
            ast_dict = await generate_document_ast(query, context, source_map, edges)
            
            # Update job record with result
            async with SessionLocal() as update_db:
                job_update = await update_db.execute(
                    select(ResearchJob).where(ResearchJob.id == job_id)
                )
                job_record = job_update.scalar_one_or_none()
                if job_record:
                    job_record.status = JobStatus.COMPLETED
                    job_record.output_ast = ast_dict
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
            # 1. Compute content hash for caching
            selected_nodes = list(source_map.values())
            input_hash = compute_job_hash(query, selected_nodes, [], edges, self.PROMPT_VERSION)
            
            async with SessionLocal() as db:
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
            wait_start_time = job_start_time  # Track when we started waiting for first message
            
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
                    logger.warning(f"No worker response in {self.WORKER_TIMEOUT_SECONDS}s, using sync fallback")
                    async for step in self._run_sync_fallback(
                        job_id, query, context, source_map, edges,
                        reason="Worker not responding"
                    ):
                        yield step
                    break
                
                try:
                    # Poll for messages with short timeout
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    
                    if message is None:
                        continue
                    
                    if message['type'] == 'message':
                        first_message_received = True
                        data = json.loads(message['data'])
                        yield data
                        
                        # Check for terminal status (handle both enum and string)
                        status = data.get('status')
                        if status in (JobStatus.COMPLETED, JobStatus.FAILED, 'COMPLETED', 'FAILED'):
                            break
                            
                except Exception as e:
                    logger.warning(f"Error reading pubsub message: {e}")
                    continue

                    
        except Exception as e:
            logger.error(f"Orchestrator error: {e}", exc_info=True)
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
                except Exception as e:
                    logger.debug(f"Error unsubscribing pubsub: {e}")
            if redis:
                try:
                    await redis.close()
                    self._redis_pool = None  # Reset pool on close
                except Exception as e:
                    logger.debug(f"Error closing redis: {e}")

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
