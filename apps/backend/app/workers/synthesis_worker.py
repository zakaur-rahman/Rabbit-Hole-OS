import json
from datetime import datetime
from typing import Optional
from arq import create_pool
from arq.connections import RedisSettings
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import ResearchJob, JobLog, JobStatus
import logging
import sys

# Windows Unicode Fix: Force UTF-8 for stdout/stderr to prevent logging crashes with arrows/emojis
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

from app.services.agents import (
    PlannerAgent, WriterAgent, ReviewerAgent,
    ChartFigureAgent, BibNormalizerAgent, MemoryAgent, RecoveryAgent
)

async def update_job_status(ctx, job_id: str, status: JobStatus, stage: str, message: str, progress: int, data: Optional[dict] = None):
    """Utility to update job status and log progress in the DB."""
    async with SessionLocal() as db:
        try:
            job_result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
            job = job_result.scalar_one_or_none()
            if job:
                job.status = status
                job.current_stage = stage
                job.progress = progress

                log = JobLog(
                    job_id=job_id,
                    stage=stage,
                    message=message,
                    agent_name=stage,
                    data=data
                )
                db.add(log)
                await db.commit()

                # Emit real-time update via Redis Pub/Sub
                redis = await ctx['redis_pool']
                update_payload = json.dumps({
                    "job_id": job_id,
                    "stage": stage,
                    "status": status,
                    "message": message,
                    "progress": progress
                })
                await redis.publish(f"job_updates:{job_id}", update_payload)
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update job status: {e}", exc_info=True)
            # Don't re-raise to avoid breaking pipeline on logging errors

async def planner_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.PLANNING, "Planning", "Architecting research structure...", 10)

    # Step 1: Read data in a short transaction
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            inputs = job.input_payload
            query = job.query
            # Copy specific context needed
            context = inputs.get("context", "")
            relationships = inputs.get("relationships", "")
        except Exception as e:
            logger.error(f"Failed to load job {job_id}: {e}")
            await update_job_status(ctx, job_id, JobStatus.FAILED, "Planning", f"Failed to load job data: {str(e)}", 10)
            return "FAILED"

    # Step 2: Do expensive work OUTSIDE transaction
    try:
        agent = PlannerAgent()
        # In a real scenario, we'd fetch relationships and context from the inputs
        response = await agent.plan(query, context, relationships)
    except Exception as e:
        logger.error(f"Planner agent failed for job {job_id}: {e}", exc_info=True)
        await update_job_status(ctx, job_id, JobStatus.FAILED, "Planning", f"Planning failed: {str(e)}", 10)
        return "FAILED"

    # Step 3: Write results in a new short transaction
    if response.status == "success":
        async with SessionLocal() as db:
            try:
                # Reload job to get latest state
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()

                # Check if job was cancelled/modified while we were working
                if job.status not in (JobStatus.PLANNING, JobStatus.IDLE):
                    logger.warning(f"Job {job_id} status changed to {job.status} during planning, aborting")
                    return "ABORTED"

                job.metadata_ = job.metadata_ or {}
                job.metadata_["plan"] = response.data
                await db.commit()

                await update_job_status(ctx, job_id, JobStatus.PLANNING, "Planning", "Research plan finalized.", 20, data=response.data)
                return "READY_FOR_WRITING"
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save plan for job {job_id}: {e}")
                await update_job_status(ctx, job_id, JobStatus.FAILED, "Planning", f"Failed to save plan: {str(e)}", 10)
                return "FAILED"
    else:
        await update_job_status(ctx, job_id, JobStatus.FAILED, "Planning", f"Failed: {response.reasoning}", 10)
        return "FAILED"

async def writer_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.WRITING, "Writing", "Synthesizing research AST...", 30)

    # 1. Read in short transaction
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            plan = job.metadata_.get("plan")
            inputs = job.input_payload
            query = job.query
            context = inputs.get("context", "")
            source_map = inputs.get("source_map", {})
        except Exception as e:
            logger.error(f"Failed to load job {job_id} for writing: {e}")
            await update_job_status(ctx, job_id, JobStatus.FAILED, "Writing", f"Failed to load job for writing: {str(e)}", 30)
            return "FAILED"

    # 2. Do work outside transaction
    try:
        agent = WriterAgent()
        response = await agent.write(query, context, plan, json.dumps(source_map))
    except Exception as e:
        logger.error(f"Writer agent failed: {e}", exc_info=True)
        await update_job_status(ctx, job_id, JobStatus.FAILED, "Writing", f"Writing failed: {str(e)}", 30)
        return "FAILED"

    # 3. Write results in new short transaction
    if response.status == "success":
        async with SessionLocal() as db:
            try:
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()

                if job.status != JobStatus.WRITING:
                    logger.warning(f"Job {job_id} status changed to {job.status} during writing, aborting")
                    return "ABORTED"

                job.output_ast = response.data
                job.metadata_ = job.metadata_ or {}
                job.metadata_["writer_completed_at"] = datetime.utcnow().isoformat()

                await db.commit()
                await update_job_status(ctx, job_id, JobStatus.WRITING, "Writing", "AST synthesis complete.", 40, data=response.data)
                return "READY_FOR_REVIEW"
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save AST: {e}")
                await update_job_status(ctx, job_id, JobStatus.FAILED, "Writing", f"Failed to save AST: {str(e)}", 30)
                return "FAILED"
    else:
        await update_job_status(ctx, job_id, JobStatus.FAILED, "Writing", f"Failed: {response.reasoning}", 30)
        return "FAILED"

async def reviewer_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.REVIEWING, "Reviewing", "Validating and refining content...", 50)

    # 1. Read
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            current_ast = job.output_ast
            inputs = job.input_payload
            context = inputs.get("context", "")
        except Exception as e:
            logger.error(f"Failed to load job {job_id} for review: {e}")
            return "FAILED"

    # 2. Execute
    try:
        agent = ReviewerAgent()
        response = await agent.review(current_ast, context)
    except Exception as e:
        logger.error(f"Reviewer agent failed: {e}", exc_info=True)
        return "FAILED"

    # 3. Write
    if response.status == "success":
        async with SessionLocal() as db:
            try:
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
                job.output_ast = response.data
                await db.commit()
                return "READY_FOR_VISUALS"
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save review result: {e}")
                return "FAILED"
    else:
        return "FAILED"

async def chart_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.VISUAL_ANALYSIS, "Visual Analysis", "Identifying data visualization opportunities...", 70)

    # 1. Read
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            current_ast = job.output_ast
        except Exception as e:
            await update_job_status(ctx, job_id, JobStatus.FAILED, "Visual Analysis", f"Failed to load job: {e}", 70)
            return "NEXT"

    # 2. Execute
    try:
        agent = ChartFigureAgent()
        response = await agent.analyze(current_ast)
    except Exception as e:
        logger.error(f"Chart agent failed: {e}", exc_info=True)
        return "NEXT"

    # 3. Write
    if response.status == "success":
        async with SessionLocal() as db:
            try:
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
                # Simple injection for now
                job.metadata_ = job.metadata_ or {}
                job.metadata_["figures"] = response.data.get("figures", [])
                await db.commit()
                return "READY_FOR_BIB"
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save figures: {e}")
                return "NEXT"
    else:
        return "NEXT"

async def bib_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.BIBLIOGRAPHY, "Bibliography", "Normalizing citations and bibliography...", 85)

    # 1. Read
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            current_ast = job.output_ast
            inputs = job.input_payload
            source_map = list(inputs.get("source_map", {}).values())
        except Exception:
            return "FAILED"

    # 2. Execute
    try:
        agent = BibNormalizerAgent()
        response = await agent.normalize(current_ast, source_map)
    except Exception as e:
        logger.error(f"Bib agent failed: {e}", exc_info=True)
        return "FAILED"

    # 3. Write
    if response.status == "success":
        async with SessionLocal() as db:
            try:
                # Reload job to get latest state
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()

                # Apply normalization updates to AST
                # In a real impl, we'd traverse the AST and replace old_id with new_id
                # For now, we just update the references list in the AST root
                if job.output_ast:
                    job.output_ast["references"] = response.data.get("normalized_references", [])
                    # We could also apply 'ast_updates' here if we had a traverser

                await db.commit()
                return "READY_FOR_MEMORY"
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save bibliography: {e}")
                return "FAILED"
    else:
        return "FAILED"

async def memory_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.COMPLETED, "Memory Update", "Updating knowledge memory...", 95)

    # 1. Read
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            current_ast = job.output_ast
            query = job.query
        except Exception:
            # Can't fail job now, just skip memory
            return "ALL_DONE"

    # 2. Execute
    try:
        agent = MemoryAgent()
        await agent.learn(query, current_ast)
    except Exception as e:
        logger.error(f"Memory agent failed: {e}", exc_info=True)

    # 3. Write (Final Status)
    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            job.status = JobStatus.COMPLETED
            job.progress = 100
            await db.commit()

            # Final notification
            redis = await ctx['redis_pool']
            await redis.publish(f"job_updates:{job_id}", json.dumps({
                "job_id": job_id,
                "status": "COMPLETED",
                "document": job.output_ast
            }))
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to finalize job: {e}")

    return "ALL_DONE"

async def compilation_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.COMPILING, "Compiling", "Converting AST to LaTeX and compiling PDF...", 90)

    async with SessionLocal() as db:
        try:
            job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
            current_ast = job.output_ast
            inputs = job.input_payload
        except Exception as e:
            logger.error(f"Failed to load job {job_id} for compilation: {e}")
            return "FAILED"

    from app.services.latex_service import generate_latex_document, compile_latex_to_pdf, map_latex_error_to_ast
    from app.services.storage import StorageService

    # 1. Generate Initial LaTeX
    try:
        latex_code = generate_latex_document(current_ast, inputs.get("source_map", {}))
    except Exception as e:
        logger.error(f"LaTeX generation failed: {e}")
        return "FAILED"

    # 2. Compilation Loop with Recovery
    MAX_ATTEMPTS = 3
    pdf_buffer = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        pdf_buffer, errors = compile_latex_to_pdf(latex_code)

        if pdf_buffer:
            break

        logger.warning(f"Compilation attempt {attempt} failed: {len(errors)} errors")

        if attempt < MAX_ATTEMPTS:
            await update_job_status(ctx, job_id, JobStatus.COMPILING, "Compiling", f"Fixing compilation errors (Attempt {attempt})...", 92)

            # Map errors and ask RecoveryAgent
            mapped_errors = map_latex_error_to_ast(errors, latex_code)
            error_desc = json.dumps(mapped_errors[:5]) # Top 5 errors

            try:
                agent = RecoveryAgent()
                diagnosis = await agent.diagnose(
                    error=f"LaTeX Compilation Failed: {error_desc}",
                    failed_agent="LatexCompiler",
                    last_output=latex_code[-2000:] # Last 2k chars might have the issue
                )

                # Check if agent gave us a plan
                if diagnosis.data.get("retry_action") == "retry":
                    # In a real system, the agent would return the FIXED latex or patch instructions.
                    # For now, we simulate a fix by stripping problematic characters or sections if possible,
                    # but since the agent just gives text instructions, we can't auto-patch easily without a dedicated patcher.
                    # TODO: Implement LatexPatcherAgent.
                    # Fallback: Just try to regenerate with a simplified template or skip?
                    # For this implementation, we will log and break if we can't apply the fix code.
                    logger.info(f"Recovery suggestion: {diagnosis.data.get('instruction_tweak')}")

                    # If the diagnosis provides new latex (it doesn't in current prompt), we'd use it.
                    # Let's try to regenerate the latex using a "safe mode" flag if we had one.
                    pass
                else:
                    logger.warning("Recovery agent suggested stopping.")
                    break
            except Exception as e:
                logger.error(f"Recovery agent crashed: {e}")
                break
        else:
             logger.error("Max compilation attempts reached.")

    # 3. Handle Result
    if pdf_buffer:
        try:
            # Upload PDF
            file_url = await StorageService.upload(pdf_buffer.getvalue(), f"{job_id}.pdf")
            logger.info(f"PDF uploaded to {file_url}")

            async with SessionLocal() as db:
                job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
                job.metadata_ = job.metadata_ or {}
                job.metadata_["latex"] = latex_code
                job.metadata_["pdf_url"] = file_url
                await db.commit()

            return "SUCCESS"

        except Exception as e:
             logger.error(f"Failed to upload PDF: {e}")
             return "SUCCESS" # Job is technically done, just upload failed
    else:
        await update_job_status(ctx, job_id, JobStatus.FAILED, "Compiling", "PDF compilation failed after multiple attempts.", 90)
        return "FAILED"

async def run_synthesis_pipeline(ctx, job_id: str):
    """Orchestrates the agent workers by chaining them."""
    logger.info(f"Worker received job {job_id}. Starting pipeline...")

    # 1. Claim checking and initialization
    async with SessionLocal() as db:
        try:
            job_result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
            job_record = job_result.scalar_one_or_none()

            if not job_record:
                logger.error(f"Job {job_id} not found")
                return

            if job_record.metadata_ and job_record.metadata_.get('execution_mode') == 'sync_fallback':
                logger.info(f"Job {job_id} already claimed for sync execution, worker aborting")
                return

            if job_record.status == JobStatus.IDLE:
                job_record.status = JobStatus.PLANNING
                job_record.metadata_ = job_record.metadata_ or {}
                job_record.metadata_['execution_mode'] = 'worker'
                job_record.metadata_['worker_claimed_at'] = datetime.utcnow().isoformat()
                await db.commit()

        except Exception as e:
            logger.error(f"Error checking job claim: {e}")
            await db.rollback()

    steps = [planner_task, writer_task, reviewer_task, chart_task, bib_task, compilation_task, memory_task]

    pipeline_failed = False
    failed_step = None
    failure_reason = None
    last_known_progress = 0

    # 2. Pipeline Execution Loop
    try:
        for step in steps:
            step_name = step.__name__
            logger.info(f"Job {job_id}: Starting step {step_name}")

            try:
                result = await step(ctx, job_id)
                logger.info(f"Job {job_id}: Step {step_name} completed with result: {result}")

                # compilation_task and memory_task are non-fatal — AST is already complete
                non_fatal_steps = {"compilation_task", "memory_task"}

                if result == "FAILED":
                    if step_name in non_fatal_steps:
                        logger.warning(f"Job {job_id}: Non-fatal step {step_name} failed, continuing pipeline")
                    else:
                        pipeline_failed = True
                        failed_step = step_name
                        failure_reason = "Step returned FAILED status"
                        break
                elif result == "ABORTED":
                    logger.warning(f"Job {job_id}: Step {step_name} aborted (status modified elsewhere)")
                    return

                # Record progress for final status if we fail later
                progress_map = {
                    "planner_task": 20, "writer_task": 40, "reviewer_task": 60,
                    "chart_task": 75, "bib_task": 85, "compilation_task": 92
                }
                last_known_progress = progress_map.get(step_name, last_known_progress)

            except Exception as e:
                if step_name in non_fatal_steps:
                    logger.warning(f"Job {job_id}: Non-fatal step {step_name} crashed: {e}")
                else:
                    pipeline_failed = True
                    failed_step = step_name
                    failure_reason = str(e)
                    logger.error(f"Job {job_id}: Unhandled exception in {step_name}: {e}", exc_info=True)
                    break

        if not pipeline_failed:
            logger.info(f"Job {job_id}: Pipeline finished successfully.")
            try:
                async with SessionLocal() as db:
                    job_result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
                    job_record = job_result.scalar_one_or_none()

                    if job_record:
                        job_record.status = JobStatus.COMPLETED
                        job_record.progress = 100
                        await db.commit()

                        # Publish success notification
                        redis = await ctx['redis_pool']
                        output_data = job_record.output_ast or {}
                        await redis.publish(f"job_updates:{job_id}", json.dumps({
                            "job_id": job_id,
                            "status": "COMPLETED",
                            "stage": "DONE",
                            "message": "Research synthesis complete",
                            "progress": 100,
                            "output_ast": output_data
                        }))
            except Exception as e:
                logger.error(f"Critical: Failed to record job success: {e}", exc_info=True)

    finally:
        # 3. Guaranteed Final State Update
        if pipeline_failed:
            logger.error(f"Job {job_id}: Finalizing as FAILED. Step: {failed_step}, Reason: {failure_reason}")
            try:
                async with SessionLocal() as db:
                    job_result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
                    job_record = job_result.scalar_one_or_none()

                    if job_record and job_record.status != JobStatus.COMPLETED:
                        job_record.status = JobStatus.FAILED
                        job_record.progress = min(last_known_progress, 98)
                        job_record.metadata_ = job_record.metadata_ or {}
                        job_record.metadata_['failure_info'] = {
                            'failed_step': failed_step,
                            'reason': failure_reason,
                            'timestamp': datetime.utcnow().isoformat()
                        }
                        await db.commit()

                        # Final Redis Failure Notification
                        redis = await ctx['redis_pool']
                        await redis.publish(f"job_updates:{job_id}", json.dumps({
                            "job_id": job_id,
                            "status": "FAILED",
                            "stage": "ERROR",
                            "message": f"Pipeline failed at {failed_step}: {failure_reason[:100]}",
                            "progress": job_record.progress
                        }))
            except Exception as e:
                logger.error(f"Critical: Failed to record job failure: {e}", exc_info=True)

class WorkerSettings:
    """arq worker configuration."""
    functions = [run_synthesis_pipeline, planner_task, writer_task, reviewer_task, chart_task, bib_task, memory_task]
    redis_settings = RedisSettings(
        host=settings.REDIS_URL.split("://")[1].split(":")[0] if settings.REDIS_URL else "localhost",
        port=int(settings.REDIS_URL.split(":")[-1].split("/")[0]) if settings.REDIS_URL and ":" in settings.REDIS_URL else 6379,
        # password=settings.REDIS_PASSWORD
    )

    async def on_startup(ctx):
        logger.info(f"Worker starting up... Connecting to Redis at {WorkerSettings.redis_settings.host}:{WorkerSettings.redis_settings.port}")
        try:
            # Fix: ctx doesn't contain redis_settings by default, use class attr
            ctx['redis_pool'] = await create_pool(WorkerSettings.redis_settings)
            logger.info("Worker successfully connected to Redis pool.")
            print("Worker startup complete - Ready for jobs")
        except Exception as e:
            logger.error(f"Worker failed to connect to Redis: {e}", exc_info=True)
            raise

    async def on_shutdown(ctx):
        from app.services.agents import BaseAgent
        await BaseAgent.cleanup_http_client()
        if 'redis_pool' in ctx:
            await ctx['redis_pool'].close()
        logger.info("Worker shutdown complete")
