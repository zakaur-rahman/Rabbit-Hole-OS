# Load environment variables from .env file
import os
from dotenv import load_dotenv
# Get the absolute path to the .env file in the backend root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)
print(f"--- Backend: Loading .env from {env_path}")

import logging
import sys

# Windows Unicode Fix: Force UTF-8 for stdout/stderr to prevent logging crashes with arrows/emojis
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
# Silence SQLAlchemy noise
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

# Database Initialization
from contextlib import asynccontextmanager
from app.core.database import get_engine, Base
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    engine = get_engine()
    async with engine.begin() as conn:
        # Import models to ensure they are registered with Base
        import app.models # noqa
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(title="RabbitHole OS API", openapi_url="/api/v1/openapi.json", lifespan=lifespan)

# CORS middleware for Electron/Next.js
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    """Legacy health check for backward compatibility."""
    return {"status": "ok", "app_name": settings.PROJECT_NAME}

