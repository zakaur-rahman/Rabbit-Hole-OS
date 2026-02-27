import asyncio
import json
from app.core.database import SessionLocal
from app.models.job import ResearchJob
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(ResearchJob).order_by(ResearchJob.created_at.desc()).limit(3)
        )
        jobs = result.scalars().all()

        if not jobs:
            print("No recent research jobs found.")
            return

        for job in jobs:
            print(f"\n{'='*60}")
            print(f"JOB ID: {job.id}")
            print(f"QUERY: {job.query}")
            print(f"STATUS: {job.status}")
            print(f"{'-'*60}")

            if job.output_ast:
                print("AGENT OUTPUT (AST):")
                print(json.dumps(job.output_ast, indent=2)[:2000] + "...")
            else:
                print("No output generated yet or job failed.")

if __name__ == "__main__":
    asyncio.run(main())
