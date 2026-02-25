from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.config import settings
from app.core.redis_client import get_redis
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
import time

router = APIRouter()

@router.get("/")
async def basic_health():
    """Basic health check for the API server."""
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "timestamp": time.time()
    }

@router.get("/deep")
async def deep_health(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Deep health check — verifies all downstream dependencies (DB + Redis).
    Use this for monitoring dashboards and alerting.
    """
    checks = {"api": "ok"}
    
    # Check database
    try:
        start = time.time()
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
        checks["db_latency_ms"] = round((time.time() - start) * 1000, 2)
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Check Redis
    try:
        start = time.time()
        await redis.ping()
        checks["redis"] = "ok"
        checks["redis_latency_ms"] = round((time.time() - start) * 1000, 2)
    except Exception as e:
        checks["redis"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for k, v in checks.items() if k.endswith(("api", "database", "redis")) or k in ("api", "database", "redis")) else "degraded"
    return {"status": status, "checks": checks}

@router.get("/worker")
async def worker_health(redis: Redis = Depends(get_redis)):
    """
    Check if the background worker is responsive via Redis.
    """
    try:
        start = time.time()
        await redis.ping()
        redis_latency = (time.time() - start) * 1000
        
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
