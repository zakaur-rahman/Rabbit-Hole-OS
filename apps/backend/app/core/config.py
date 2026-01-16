from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "RabbitHole OS"
    # DATABASE_URL - MUST use postgresql+asyncpg:// for async operations
    # If .env has postgresql://, it will be converted to postgresql+asyncpg:// in database.py
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_lSBda1CeV4Kg@ep-frosty-lab-a459nw67-pooler.us-east-1.aws.neon.tech/neondb?ssl=require"
    
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
    UPSTASH_REDIS_REST_URL: str = "https://free-ewe-10710.upstash.io"
    UPSTASH_REDIS_REST_TOKEN: str = "ASnWAAIncDIxNThkMTIxNjZiMzM0MjU40D11Mz1jNWFhMTRhNWIxZXAYMTA3MTA"
    
    # Legacy Redis config (deprecated, use UPSTASH_REDIS_* instead)
    REDIS_URL: Optional[str] = None
    REDIS_PASSWORD: Optional[str] = None
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
