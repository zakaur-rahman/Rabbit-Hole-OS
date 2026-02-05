from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "RabbitHole OS"
    # DATABASE_URL - MUST use postgresql+asyncpg:// for async operations
    # If .env has postgresql://, it will be converted to postgresql+asyncpg:// in database.py
    DATABASE_URL: str = ""
    
    # AI API Keys
    CHUTES_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URI_WEB: str = "https://auth.cognode.ai/oauth/google/callback"
    OAUTH_REDIRECT_URI_DESKTOP: str = "cognode://auth/callback"
    
    # JWT Configuration
    JWT_SECRET_KEY: str = ""  # Should be a strong random secret in production
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days
    
    # Redis Configuration (Upstash Redis)
    # Default values from Upstash dashboard (override in .env file if needed)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""
    
    # Legacy Redis config (deprecated, use UPSTASH_REDIS_* instead)
    REDIS_URL: Optional[str] = None
    REDIS_PASSWORD: Optional[str] = None
    
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
