from sqlalchemy import String, Integer, ForeignKey, Text, JSON, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base
import datetime
import enum
from typing import List, Optional

class JobStatus(str, enum.Enum):
    IDLE = "IDLE"
    PLANNING = "PLANNING"
    WRITING = "WRITING"
    REVIEWING = "REVIEWING"
    VISUAL_ANALYSIS = "VISUAL_ANALYSIS"
    BIBLIOGRAPHY = "BIBLIOGRAPHY"
    COMPILING = "COMPILING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ResearchJob(Base):
    __tablename__ = "research_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True) # job_id (uuid)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    whiteboard_id: Mapped[str] = mapped_column(String, ForeignKey("whiteboards.id"), nullable=False)
    parent_job_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("research_jobs.id"), nullable=True)
    
    status: Mapped[JobStatus] = mapped_column(SQLEnum(JobStatus), default=JobStatus.IDLE)
    document_version: Mapped[str] = mapped_column(String, default="v1.0.0")
    prompt_hash: Mapped[str] = mapped_column(String, index=True)
    
    query: Mapped[str] = mapped_column(String)
    input_payload: Mapped[dict] = mapped_column(JSON) # selected_nodes, topics, edges
    
    output_ast: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    output_pdf_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    current_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True) # More granular stage name
    progress: Mapped[int] = mapped_column(Integer, default=0) # 0-100
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    logs = relationship("JobLog", back_populates="job", cascade="all, delete-orphan")

class JobLog(Base):
    __tablename__ = "job_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String, ForeignKey("research_jobs.id"), nullable=False)
    
    agent_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stage: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # Granular data/result of the stage
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    job = relationship("ResearchJob", back_populates="logs")
