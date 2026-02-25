"""
OAuth 2.0 API endpoints
"""
import secrets
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.jwt import verify_token, create_access_token, hash_refresh_token, create_refresh_token
from app.core.config import settings
from app.core.redis_client import get_redis, RedisKeys
from app.services.oauth_service import exchange_google_code
from app.services.geo_service import get_location_from_ip
from app.models.user import User
from app.models.session import Session
from sqlalchemy import select, text, update, func
from datetime import datetime, timedelta
from redis.asyncio import Redis

# In-memory cache for user objects to prevent N+1 queries during auth
# key: user_id (UUID), value: (User, expiry)
_user_cache = {}
USER_CACHE_TTL = timedelta(minutes=10)

# Track last session update to throttle database writes
# key: session_id (str), value: last_updated (datetime)
_session_update_tracker = {}
SESSION_UPDATE_THROTTLE = timedelta(minutes=5)

router = APIRouter()
security = HTTPBearer()


class OAuthExchangeRequest(BaseModel):
    code: str
    code_verifier: str
    state: Optional[str] = None
    redirect_uri: Optional[str] = None  # The redirect URI used in the OAuth request
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    platform: Optional[str] = None
    app_version: Optional[str] = None
    user_agent: Optional[str] = None
    # Desktop deep link flow: if present, generate a one-time auth code
    desktop_device_id: Optional[str] = None
    desktop_redirect_uri: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
    desktop_auth_code: Optional[str] = None


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DesktopExchangeRequest(BaseModel):
    """Request schema for exchanging a one-time desktop auth code for tokens"""
    code: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    platform: Optional[str] = None
    app_version: Optional[str] = None
    user_agent: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    plan: str = "free"


class SessionResponse(BaseModel):
    id: str
    device_id: Optional[str]
    device_name: Optional[str]
    platform: Optional[str] = None
    app_version: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    is_current: bool = False


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user"""
    import uuid as uuid_lib
    
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    print(f"DEBUG: Token verified for user: {payload.get('sub')}")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Convert user_id to UUID if it's a string
    try:
        if isinstance(user_id, str):
            user_id = uuid_lib.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
        )
    
    # 1. Check user cache
    now = datetime.utcnow()
    if user_id in _user_cache:
        cached_user, expiry = _user_cache[user_id]
        if now < expiry:
            user = cached_user
        else:
            del _user_cache[user_id]
            user = None
    else:
        user = None

    # 2. Query DB if not cached
    if user is None:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        # Store in cache
        _user_cache[user_id] = (user, now + USER_CACHE_TTL)
    
    # 3. Update last_active_at (Throttled)
    session_id = payload.get("session_id")
    if session_id:
        last_updated = _session_update_tracker.get(session_id)
        if not last_updated or (now - last_updated) > SESSION_UPDATE_THROTTLE:
            try:
                # Use a separate background session or just update within this one but throttle
                await db.execute(
                    update(Session)
                    .where(Session.id == uuid_lib.UUID(session_id))
                    .values(last_active_at=func.now())
                )
                await db.commit()
                _session_update_tracker[session_id] = now
                print(f"DEBUG: Throttled session update for {session_id[:8]}...")
            except Exception as e:
                print(f"Failed to update session activity: {e}")
                await db.rollback()

    return user


@router.post("/oauth/google/exchange", response_model=TokenResponse)
async def exchange_code(
    request: OAuthExchangeRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Google OAuth authorization code for access and refresh tokens
    """
    try:
        # Desktop-only: Use loopback redirect (Google recommended for desktop apps)
        # The redirect URI must match what was used in the OAuth request (http://127.0.0.1:PORT/oauth/callback)
        redirect_uri = request.redirect_uri or "http://127.0.0.1:53682/oauth/callback"
        
        # Capture client IP (handle proxies)
        forwarded = req.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = req.client.host if req.client else None

        token_response = await exchange_google_code(
            code=request.code,
            code_verifier=request.code_verifier,
            redirect_uri=request.redirect_uri,
            db=db,
            device_id=request.device_id,
            device_name=request.device_name,
            platform=request.platform,
            app_version=request.app_version,
            user_agent=request.user_agent or req.headers.get("User-Agent"),
            ip_address=ip_address
        )

        response_data = dict(token_response)

        # Desktop deep link flow: generate a one-time auth code stored in Redis
        if request.desktop_device_id and request.desktop_redirect_uri:
            try:
                redis = await get_redis()
                desktop_auth_code = secrets.token_urlsafe(32)
                code_payload = json.dumps({
                    "user_id": token_response["user"]["id"],
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response["refresh_token"],
                })
                await redis.set(
                    f"desktop_auth_code:{desktop_auth_code}",
                    code_payload,
                    ex=300,  # 5-minute TTL — single use
                )
                response_data["desktop_auth_code"] = desktop_auth_code
            except Exception as e:
                print(f"[Desktop Auth Code Error] Failed to store code in Redis: {e}")

        return response_data
    except ValueError as e:
        # ValueError includes validation errors and clear error messages
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is (e.g., from nested functions)
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_trace = traceback.format_exc()
        print(f"[OAuth Exchange Error] {type(e).__name__}: {str(e)}")
        print(f"[OAuth Exchange Traceback]\n{error_trace}")
        
        # Return a more informative error message
        error_detail = str(e) if str(e) else f"{type(e).__name__}: An unexpected error occurred"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to exchange authorization code: {error_detail}",
        )


@router.post("/oauth/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    """
    Refresh access token using refresh token
    Implements refresh token rotation for security
    """
    # Verify refresh token
    payload = verify_token(request.refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    user_id = payload.get("sub")
    session_id = payload.get("session_id")
    
    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Check if token is revoked
    token_hash = hash_refresh_token(request.refresh_token)
    revoked_key = RedisKeys.REVOKED_TOKEN.format(token_hash=token_hash)
    try:
        is_revoked = await redis_client.get(revoked_key)
        if is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )
    except Exception as e:
        # Graceful fallback: log error but continue if Redis fails
        print(f"[Redis Error] Failed to check revoked token: {str(e)}")
    
    # Get session
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if session is None or session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or revoked",
        )
    
    if session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )
    
    # Revoke old refresh token (rotation)
    # Upstash Redis uses set() with ex parameter instead of setex()
    try:
        await redis_client.set(revoked_key, "1", ex=86400 * 30)  # 30 days
    except Exception as e:
        print(f"[Redis Error] Failed to revoke old refresh token: {str(e)}")
    
    # Create new access token
    access_token = create_access_token({
        "sub": user_id,
        "session_id": session_id,
    })
    
    return AccessTokenResponse(access_token=access_token, token_type="bearer")


@router.post("/oauth/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    """
    Logout and revoke current session
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    
    if payload:
        session_id = payload.get("session_id")
        if session_id:
            # Revoke session
            result = await db.execute(
                select(Session).where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                session.revoked_at = datetime.utcnow()
                await db.commit()
    
    return {"message": "Logged out successfully"}


@router.get("/oauth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        plan="free"  # Default hardcoded for now, waiting for database integration
    )


@router.get("/oauth/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """
    List all active sessions for the current user
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    current_session_id = payload.get("session_id") if payload else None
    
    # Get all sessions for the user
    # Use explicit UUID casting in SQL to handle type mismatch
    import uuid as uuid_lib
    user_id_uuid = current_user.id if isinstance(current_user.id, uuid_lib.UUID) else uuid_lib.UUID(str(current_user.id))
    
    # Use text() with bindparams() for proper parameter binding
    result = await db.execute(
        select(Session)
        .where(text("sessions.user_id::uuid = :user_id").bindparams(user_id=user_id_uuid))
        .where(Session.revoked_at.is_(None))
        .where(Session.expires_at > datetime.utcnow())
        .order_by(Session.expires_at.desc())
    )
    sessions = result.scalars().all()
    
    return [
        SessionResponse(
            id=str(session.id),
            device_id=session.device_id,
            device_name=session.device_name,
            platform=session.platform,
            app_version=session.app_version,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            country=session.country,
            region=session.region,
            city=session.city,
            timezone=session.timezone,
            created_at=session.created_at or (session.expires_at - timedelta(days=30)),
            expires_at=session.expires_at,
            revoked_at=session.revoked_at,
            is_current=str(session.id) == current_session_id,
        )
        for session in sessions
    ]


@router.post("/oauth/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    """
    Revoke a specific session
    """
    import uuid as uuid_lib
    user_id_uuid = current_user.id if isinstance(current_user.id, uuid_lib.UUID) else uuid_lib.UUID(str(current_user.id))
    session_id_uuid = uuid_lib.UUID(session_id) if isinstance(session_id, str) else session_id

    # Use text() with bindparams() for proper parameter binding and casting
    result = await db.execute(
        select(Session)
        .where(text("sessions.id::uuid = :session_id").bindparams(session_id=session_id_uuid))
        .where(text("sessions.user_id::uuid = :user_id").bindparams(user_id=user_id_uuid))
    )
    session = result.scalar_one_or_none()
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    if session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already revoked",
        )
    
    # Revoke the session
    session.revoked_at = datetime.utcnow()
    await db.commit()
    
    # Also revoke the refresh token in Redis
    token_hash = session.refresh_token_hash
    revoked_key = RedisKeys.REVOKED_TOKEN.format(token_hash=token_hash)
    try:
        await redis_client.set(revoked_key, "1", ex=86400 * 30)  # 30 days
    except Exception as e:
        print(f"[Redis Error] Failed to revoke session in Redis: {str(e)}")
    
    return {"message": "Session revoked successfully"}


@router.post("/oauth/sessions/revoke-all")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    """
    Revoke all sessions except the current one
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    current_session_id = payload.get("session_id") if payload else None
    
    import uuid as uuid_lib
    user_id_uuid = current_user.id if isinstance(current_user.id, uuid_lib.UUID) else uuid_lib.UUID(str(current_user.id))

    # Get all active sessions for the user
    query = select(Session).where(
        text("sessions.user_id::uuid = :user_id").bindparams(user_id=user_id_uuid)
    ).where(
        Session.revoked_at.is_(None)
    )
    
    if current_session_id:
        current_session_id_uuid = uuid_lib.UUID(current_session_id) if isinstance(current_session_id, str) else current_session_id
        query = query.where(text("sessions.id::uuid != :current_session_id").bindparams(current_session_id=current_session_id_uuid))
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    # Revoke all sessions
    revoked_count = 0
    for session in sessions:
        session.revoked_at = datetime.utcnow()
        # Also revoke the refresh token in Redis
        token_hash = session.refresh_token_hash
        revoked_key = RedisKeys.REVOKED_TOKEN.format(token_hash=token_hash)
        try:
            await redis_client.set(revoked_key, "1", ex=86400 * 30)  # 30 days
        except Exception as e:
            print(f"[Redis Error] Failed to revoke session {session.id} in Redis: {str(e)}")
        revoked_count += 1
    
    await db.commit()
    
    return {"message": f"Revoked {revoked_count} session(s)"}


@router.post("/oauth/desktop/exchange")
async def desktop_exchange(
    request: DesktopExchangeRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a one-time desktop auth code for access and refresh tokens.
    The code is generated during the web-based Google OAuth exchange when
    the request includes desktop_device_id and desktop_redirect_uri.
    Codes are single-use and expire after 5 minutes.
    """
    try:
        redis = await get_redis()
        key = f"desktop_auth_code:{request.code}"
        raw = await redis.get(key)

        if not raw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired desktop auth code",
            )

        # DELETE immediately — one-time use only
        await redis.delete(key)

        data = json.loads(raw)

        # Look up the user to return fresh info
        import uuid as uuid_lib
        user_id = uuid_lib.UUID(data["user_id"])
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        # Resolve location from IP
        forwarded = req.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = req.client.host if req.client else None

        location = await get_location_from_ip(ip_address) if ip_address else {}

        # Create new refresh token
        refresh_token = create_refresh_token({"sub": str(user.id), "session_id": None})
        refresh_token_hash = hash_refresh_token(refresh_token)

        # Create session
        session = Session(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            device_id=request.device_id,
            device_name=request.device_name,
            platform=request.platform,
            app_version=request.app_version,
            user_agent=request.user_agent or req.headers.get("User-Agent"),
            ip_address=ip_address,
            country=location.get("country"),
            region=location.get("region"),
            city=location.get("city"),
            timezone=location.get("timezone"),
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Update refresh token with new session ID
        refresh_token = create_refresh_token({
            "sub": str(user.id),
            "session_id": str(session.id),
        })
        refresh_token_hash = hash_refresh_token(refresh_token)
        session.refresh_token_hash = refresh_token_hash
        await db.commit()

        # Create new access token
        access_token_jwt = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "session_id": str(session.id),
        })

        return {
            "access_token": access_token_jwt,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Desktop Exchange Error] {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to exchange desktop auth code",
        )
