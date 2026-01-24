# Load environment variables from .env file
import os
from dotenv import load_dotenv
# Get the absolute path to the .env file in the backend root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)
print(f"--- Backend: Loading .env from {env_path}")

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
    print("--- Database: Initializing schema...")
    engine = get_engine()
    async with engine.begin() as conn:
        # Import models to ensure they are registered with Base
        import app.models # noqa
        await conn.run_sync(Base.metadata.create_all)
    print("--- Database: Schema initialized.")
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
    return {"status": "ok", "app_name": settings.PROJECT_NAME}

