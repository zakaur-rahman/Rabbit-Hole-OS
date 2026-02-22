"""
Redis client for session management and caching using standard Redis
"""
from typing import Optional
from app.core.config import settings
from redis.asyncio import Redis as AsyncRedis
import json


class RedisClient:
    _client: Optional[AsyncRedis] = None
    
    @classmethod
    async def get_client(cls) -> AsyncRedis:
        """Get or create standard Redis async client"""
        if cls._client is None:
            redis_url = settings.REDIS_URL or "redis://localhost:6379"
            
            # Use standard redis.asyncio
            cls._client = AsyncRedis.from_url(
                redis_url,
                password=settings.REDIS_PASSWORD,
                decode_responses=True
            )
        return cls._client
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._client:
            await cls._client.close()
            cls._client = None


async def get_redis() -> AsyncRedis:
    """Dependency to get Redis client"""
    return await RedisClient.get_client()


# Redis key prefixes
class RedisKeys:
    PKCE_VERIFIER = "pkce:verifier:{state}"
    SESSION = "session:{user_id}:{session_id}"
    REFRESH_TOKEN = "refresh:token:{token_hash}"
    REVOKED_TOKEN = "revoked:token:{token_hash}"
    RATE_LIMIT = "rate:limit:{identifier}:{window}"
