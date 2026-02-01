from typing import Optional, Dict, Any
from sqlalchemy import select, desc
from app.models.job import ResearchJob, JobStatus
from app.core.database import SessionLocal

class VersioningService:
    @staticmethod
    def increment_version(current_version: str) -> str:
        """Increments semver-like version string (v1.0.0 -> v1.0.1)."""
        try:
            prefix = "v" if current_version.startswith("v") else ""
            version_vals = current_version.lstrip("v").split(".")
            if len(version_vals) < 3:
                return "v1.0.1"
            
            major, minor, patch = map(int, version_vals)
            patch += 1
            return f"{prefix}{major}.{minor}.{patch}"
        except Exception:
            return "v1.0.1"

    @classmethod
    async def create_new_version_job(cls, db: SessionLocal, parent_job_id: str) -> str:
        """
        Logic to determine next version number based on parent job.
        """
        result = await db.execute(select(ResearchJob).where(ResearchJob.id == parent_job_id))
        parent = result.scalar_one_or_none()
        if not parent:
            return "v1.0.0"
        
        return cls.increment_version(parent.document_version)

    @staticmethod
    async def get_document_history(db: SessionLocal, whiteboard_id: str, query_hash: str):
        """Returns all versions for a specific research thread."""
        result = await db.execute(
            select(ResearchJob)
            .where(
                ResearchJob.whiteboard_id == whiteboard_id,
                ResearchJob.prompt_hash == query_hash
            )
            .order_by(desc(ResearchJob.created_at))
        )
        return result.scalars().all()
