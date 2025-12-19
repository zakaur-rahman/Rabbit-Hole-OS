from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "RabbitHole OS"
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_lSBda1CeV4Kg@ep-frosty-lab-a459nw67-pooler.us-east-1.aws.neon.tech/neondb?ssl=require"
    
    # AI API Keys
    CHUTES_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
