from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.config import settings
from app.core.redis_client import get_redis
from upstash_redis.asyncio import Redis
import time
import uuid

router = APIRouter()

@router.get("/")
async def basic_health():
    """Basic health check for the API server."""
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "timestamp": time.time()
    }

@router.get("/worker")
async def worker_health(redis: Redis = Depends(get_redis)):
    """
    Check if the background worker is responsive via Redis.
    """
    try:
        # 1. Check Redis connectivity
        start = time.time()
        await redis.ping()
        redis_latency = (time.time() - start) * 1000
        
        # 2. Check for worker heartbeats (if implemented in worker)
        # For now, we can check basic queue visibility if possible, 
        # but a simple Redis ping is a good start.
        
        return {
            "status": "healthy",
            "redis_connected": True,
            "redis_latency_ms": round(redis_latency, 2)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "reason": str(e)
        }
