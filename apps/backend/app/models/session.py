from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    refresh_token_hash = Column(String, nullable=False, index=True)
    device_id = Column(String, nullable=True)  # Unique device identifier
    device_name = Column(String, nullable=True)  # Descriptive device name
    platform = Column(String, nullable=True)  # Windows / macOS / Linux
    app_version = Column(String, nullable=True)  # App version
    user_agent = Column(String, nullable=True)  # Browser user agent
    ip_address = Column(String, nullable=True)  # Client IP address
    country = Column(String, nullable=True)
    region = Column(String, nullable=True)
    city = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
