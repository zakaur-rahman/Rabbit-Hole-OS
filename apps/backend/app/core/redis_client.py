"""
Redis client for session management and caching using Upstash Redis
"""
from typing import Optional
from app.core.config import settings
from upstash_redis.asyncio import Redis as AsyncRedis
import json


class RedisClient:
    _client: Optional[AsyncRedis] = None
    
    @classmethod
    async def get_client(cls) -> AsyncRedis:
        """Get or create Upstash Redis async client"""
        if cls._client is None:
            # Validate configuration
            if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
                raise ValueError(
                    "Upstash Redis credentials not configured. "
                    "Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env file."
                )
            
            # Use Upstash Redis REST API with async support
            cls._client = AsyncRedis(
                url=settings.UPSTASH_REDIS_REST_URL,
                token=settings.UPSTASH_REDIS_REST_TOKEN,
            )
        return cls._client
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._client:
            # Upstash Redis async client doesn't need explicit close
            # but we'll reset the reference
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
