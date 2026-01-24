from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base
import datetime

class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id"))
    target_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id"))
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    whiteboard_id: Mapped[str] = mapped_column(String, ForeignKey("whiteboards.id"), nullable=False)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user = relationship("User")
    source = relationship("Node", foreign_keys=[source_id])
    target = relationship("Node", foreign_keys=[target_id])
    whiteboard = relationship("Whiteboard", back_populates="edges")
