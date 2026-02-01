import asyncio
import json
from datetime import datetime
from typing import Optional, Dict, Any
from arq import create_pool
from arq.connections import RedisSettings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models.job import ResearchJob, JobLog, JobStatus
from app.services.agents import (
    PlannerAgent, WriterAgent, ReviewerAgent, 
    ChartFigureAgent, BibNormalizerAgent, MemoryAgent
)

async def update_job_status(ctx, job_id: str, status: JobStatus, stage: str, message: str, progress: int, data: Optional[dict] = None):
    """Utility to update job status and log progress in the DB."""
    async with SessionLocal() as db:
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
            
            # TODO: Emit real-time update via Redis Pub/Sub for SSE/WebSockets
            redis = await ctx['redis_pool']
            update_payload = json.dumps({
                "job_id": job_id,
                "stage": stage,
                "status": status,
                "message": message,
                "progress": progress
            })
            await redis.publish(f"job_updates:{job_id}", update_payload)

async def planner_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.PLANNING, "Planning", "Architecting research structure...", 10)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        inputs = job.input_payload
        
        agent = PlannerAgent()
        # In a real scenario, we'd fetch relationships and context from the inputs
        # For now, we assume inputs contains canonical context
        response = await agent.plan(job.query, inputs.get("context", ""), inputs.get("relationships", ""))
        
        if response.status == "success":
            job.metadata_ = job.metadata_ or {}
            job.metadata_["plan"] = response.data
            await db.commit()
            await update_job_status(ctx, job_id, JobStatus.PLANNING, "Planning", "Research plan finalized.", 20, data=response.data)
            return "READY_FOR_WRITING"
        else:
            await update_job_status(ctx, job_id, JobStatus.FAILED, "Planning", f"Failed: {response.reasoning}", 10)
            return "FAILED"

async def writer_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.WRITING, "Writing", "Synthesizing research AST...", 30)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        plan = job.metadata_["plan"]
        inputs = job.input_payload
        
        agent = WriterAgent()
        response = await agent.write(job.query, inputs.get("context", ""), plan, json.dumps(inputs.get("source_map", {})))
        
        if response.status == "success":
            job.output_ast = response.data
            await db.commit()
            await update_job_status(ctx, job_id, JobStatus.WRITING, "Writing", "AST synthesis complete.", 40, data=response.data)
            return "READY_FOR_REVIEW"
        else:
            await update_job_status(ctx, job_id, JobStatus.FAILED, "Writing", f"Failed: {response.reasoning}", 30)
            return "FAILED"

async def reviewer_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.REVIEWING, "Reviewing", "Validating and refining content...", 50)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        current_ast = job.output_ast
        inputs = job.input_payload
        
        agent = ReviewerAgent()
        response = await agent.review(current_ast, inputs.get("context", ""))
        
        if response.status == "success":
            job.output_ast = response.data
            await db.commit()
            return "READY_FOR_VISUALS"
        else:
            return "FAILED"

async def chart_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.VISUAL_ANALYSIS, "Visual Analysis", "Identifying data visualization opportunities...", 70)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        current_ast = job.output_ast
        
        agent = ChartFigureAgent()
        response = await agent.analyze(current_ast)
        
        if response.status == "success":
            # Simple injection for now
            job.metadata_ = job.metadata_ or {}
            job.metadata_["figures"] = response.data.get("figures", [])
            await db.commit()
            return "READY_FOR_BIB"
        else:
            return "NEXT" # Skip visuals if fail

async def bib_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.BIBLIOGRAPHY, "Bibliography", "Normalizing citations and bibliography...", 85)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        current_ast = job.output_ast
        inputs = job.input_payload
        
        agent = BibNormalizerAgent()
        response = await agent.normalize(current_ast, list(inputs.get("source_map", {}).values()))
        
        if response.status == "success":
            # Apply updates if available
            await db.commit()
            return "READY_FOR_MEMORY"
        else:
            return "FAILED"

async def memory_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.COMPLETED, "Memory Update", "Updating knowledge memory...", 95)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        current_ast = job.output_ast
        
        agent = MemoryAgent()
        await agent.learn(job.query, current_ast)
        
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
        return "ALL_DONE"

async def compilation_task(ctx, job_id: str):
    await update_job_status(ctx, job_id, JobStatus.COMPILING, "Compiling", "Converting AST to LaTeX and compiling PDF...", 90)
    
    async with SessionLocal() as db:
        job = (await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))).scalar_one()
        current_ast = job.output_ast
        inputs = job.input_payload
        
        from app.services.latex_service import generate_latex_document, compile_latex_to_pdf, map_latex_error_to_ast
        
        # 1. Generate LaTeX
        latex_code = generate_latex_document(current_ast, inputs.get("source_map", {}))
        
        # 2. Compile (Loop with mapping if fail)
        pdf_buffer, errors = compile_latex_to_pdf(latex_code)
        
        if not pdf_buffer and errors:
            # Map errors to AST
            mapped_errors = map_latex_error_to_ast(errors, latex_code)
            await update_job_status(ctx, job_id, JobStatus.COMPILING, "Compiling", f"Fixing {len(mapped_errors)} compilation errors...", 92)
            
            # TODO: Use RecoveryAgent to patch AST based on errors
            # For now, we fallback to log and fail or return tex
            pass
            
        if pdf_buffer:
            # TODO: Store PDF in S3/Supabase and update job.output_pdf_url
            job.metadata_ = job.metadata_ or {}
            job.metadata_["latex"] = latex_code
            await db.commit()
            return "SUCCESS"
        else:
            return "FAILED"

async def run_synthesis_pipeline(ctx, job_id: str):
    """Orchestrates the agent workers by chaining them."""
    steps = [planner_task, writer_task, reviewer_task, chart_task, bib_task, compilation_task, memory_task]
    
    for step in steps:
        result = await step(ctx, job_id)
        if result == "FAILED":
            # Update job status to FAILED if not already set by the task
            break

class WorkerSettings:
    """arq worker configuration."""
    functions = [run_synthesis_pipeline, planner_task, writer_task, reviewer_task, chart_task, bib_task, memory_task]
    redis_settings = RedisSettings(
        host=settings.REDIS_URL.split("://")[1].split(":")[0] if settings.REDIS_URL else "localhost",
        port=int(settings.REDIS_URL.split(":")[-1].split("/")[0]) if settings.REDIS_URL and ":" in settings.REDIS_URL else 6379,
        # password=settings.REDIS_PASSWORD
    )
    
    async def on_startup(ctx):
        ctx['redis_pool'] = await create_pool(ctx['redis_settings'])
        print("Worker startup complete")

    async def on_shutdown(ctx):
        await ctx['redis_pool'].close()
        print("Worker shutdown complete")
