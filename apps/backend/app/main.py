from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title="RabbitHole OS API", openapi_url="/api/v1/openapi.json")

# CORS middleware for Electron/Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production this should be restricted, but for Electron + Localhost it's usually fine
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "app_name": settings.PROJECT_NAME}
