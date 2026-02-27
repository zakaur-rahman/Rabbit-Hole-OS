import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "RabbitHole OS"
    # DATABASE_URL - MUST use postgresql+asyncpg:// for async operations
    # If .env has postgresql://, it will be converted to postgresql+asyncpg:// in database.py
    DATABASE_URL: str = ""

    # AI API Keys
    GEMINI_API_KEY: Optional[str] = None
    CHUTES_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URI_WEB: str = "https://auth.cognode.ai/oauth/google/callback"
    OAUTH_REDIRECT_URI_DESKTOP: str = "cognode://auth/callback"

    # JWT Configuration
    JWT_SECRET_KEY: str = ""  # MUST be set in production (validated at startup)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days

    # Redis Configuration (standard Redis)
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None

    # Database Pool Configuration (tune for your DB plan)
    DB_POOL_SIZE: int = 3       # Conservative for free tier
    DB_MAX_OVERFLOW: int = 5    # Burst capacity (total max = pool_size + max_overflow)
    DB_POOL_RECYCLE: int = 300  # 5 min — free tier connections may be reaped
    DB_POOL_TIMEOUT: int = 10   # Fail fast

    # Storage Configuration
    STORAGE_TYPE: str = "local"  # local, s3, supabase
    STORAGE_LOCAL_DIR: str = "uploads"
    STORAGE_BUCKET: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Validate critical secrets at startup in production
if os.getenv("NODE_ENV") == "production":
    if not settings.JWT_SECRET_KEY:
        raise RuntimeError(
            "FATAL: JWT_SECRET_KEY must be set in production. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    if not settings.DATABASE_URL:
        raise RuntimeError("FATAL: DATABASE_URL must be set in production.")
