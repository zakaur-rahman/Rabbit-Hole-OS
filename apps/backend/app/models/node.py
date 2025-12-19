from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base
import datetime

class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, index=True) # article, video, synthesis
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding = mapped_column(Vector(1536)) # OpenAI embedding size
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id"))
    target_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id"))
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships could be added here
