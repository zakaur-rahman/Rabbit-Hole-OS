"""
OAuth service for Google OAuth 2.0
"""
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.session import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.core.jwt import create_access_token, create_refresh_token, hash_refresh_token
import hashlib


async def exchange_google_code(
    code: str,
    code_verifier: str,
    redirect_uri: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Exchange Google OAuth authorization code for tokens
    
    Args:
        code: Authorization code from Google
        code_verifier: PKCE code verifier
        redirect_uri: OAuth redirect URI
        db: Database session
    
    Returns:
        Dictionary with access_token, refresh_token, and user info
    """
    # Exchange code for tokens with PKCE
    # Note: Google OAuth behavior depends on client type:
    # - Desktop app type: Does NOT require client_secret (PKCE only)  
    # - Web application type: REQUIRES client_secret even with PKCE
    # Since we're getting "client_secret is missing" error, the client is configured as Web application type
    # Therefore, we MUST include client_secret in the token exchange
    async with httpx.AsyncClient() as client:
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        }
        
        # Always include client_secret if available
        # For Web application OAuth clients, this is REQUIRED
        # For Desktop app type clients, Google will ignore it but it won't cause errors
        if settings.GOOGLE_CLIENT_SECRET:
            token_data["client_secret"] = settings.GOOGLE_CLIENT_SECRET
        else:
            # If client_secret is missing and Google requires it, raise a clear error
            raise ValueError(
                "GOOGLE_CLIENT_SECRET is required for your Google OAuth client configuration. "
                "Your OAuth client appears to be configured as a 'Web application' type, which requires client_secret. "
                "Please set GOOGLE_CLIENT_SECRET in your .env file. "
                "To get your client secret: Google Cloud Console → APIs & Services → Credentials → Your OAuth Client → Client Secret"
            )
        
        # Log request details for debugging (mask sensitive data)
        print(f"[OAuth Exchange] Sending token exchange request to Google")
        print(f"[OAuth Exchange] Client ID: {settings.GOOGLE_CLIENT_ID[:20]}...")
        print(f"[OAuth Exchange] Redirect URI: {redirect_uri}")
        print(f"[OAuth Exchange] Has client_secret: {bool(settings.GOOGLE_CLIENT_SECRET)}")
        print(f"[OAuth Exchange] Has code_verifier: {bool(code_verifier)}")
        
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data=token_data,
        )
        
        print(f"[OAuth Exchange] Google response status: {token_response.status_code}")
        
        if token_response.status_code != 200:
            # Log the full error response for debugging
            try:
                error_data = token_response.json()
                error_type = error_data.get('error', 'unknown_error')
                error_description = error_data.get('error_description', 'No description provided')
                print(f"[Google Token Exchange Error] Status: {token_response.status_code}")
                print(f"[Google Token Exchange Error] Type: {error_type}")
                print(f"[Google Token Exchange Error] Description: {error_description}")
                print(f"[Google Token Exchange Error] Full response: {error_data}")
                
                # Provide a more helpful error message
                raise ValueError(
                    f"Google OAuth token exchange failed: {error_description} "
                    f"(Error: {error_type}, Status: {token_response.status_code})"
                )
            except Exception as parse_error:
                # If we can't parse the error response, return the raw response
                error_text = token_response.text[:500]  # Limit length
                print(f"[Google Token Exchange Error] Could not parse response: {parse_error}")
                print(f"[Google Token Exchange Error] Raw response: {error_text}")
                raise ValueError(
                    f"Google OAuth token exchange failed with status {token_response.status_code}. "
                    f"Response: {error_text}"
                )
        
        token_data = token_response.json()
        id_token = token_data.get("id_token")
        access_token = token_data.get("access_token")
        
        if not id_token:
            raise ValueError("Google OAuth response missing id_token. Token exchange may have failed.")
        
        if not access_token:
            raise ValueError("Google OAuth response missing access_token. Token exchange may have failed.")
    
    # Verify ID token
    try:
        user_info = await verify_google_id_token(id_token)
    except Exception as e:
        raise ValueError(f"Failed to verify Google ID token: {str(e)}") from e
    
    # Get or create user
    try:
        user = await get_or_create_user(db, user_info)
    except Exception as e:
        raise ValueError(f"Failed to get or create user: {str(e)}") from e
    
    # Create refresh token
    refresh_token = create_refresh_token({"sub": str(user.id), "session_id": None})
    refresh_token_hash = hash_refresh_token(refresh_token)
    
    # Create session
    session = Session(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Update refresh token with session ID
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "session_id": str(session.id),
    })
    refresh_token_hash = hash_refresh_token(refresh_token)
    session.refresh_token_hash = refresh_token_hash
    await db.commit()
    
    # Create access token
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


async def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Google ID token and extract user info
    
    Args:
        id_token: Google ID token
    
    Returns:
        User information dictionary
    """
    # In production, verify the token signature with Google's public keys
    # For now, we'll decode it (Google tokens are signed)
    import jwt as pyjwt
    
    try:
        # Decode without verification first to get the token info
        # In production, fetch Google's public keys and verify
        decoded = pyjwt.decode(
            id_token,
            options={"verify_signature": False}  # TODO: Implement proper verification
        )
        
        # Verify issuer
        if decoded.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid token issuer")
        
        return {
            "google_id": decoded.get("sub"),
            "email": decoded.get("email"),
            "name": decoded.get("name"),
            "picture": decoded.get("picture"),
        }
    except pyjwt.DecodeError as e:
        raise ValueError(f"Invalid ID token format: {str(e)}") from e
    except Exception as e:
        raise ValueError(f"Failed to decode Google ID token: {str(e)}") from e


async def get_or_create_user(db: AsyncSession, user_info: Dict[str, Any]) -> User:
    """
    Get existing user or create new user from Google info
    
    Args:
        db: Database session
        user_info: User information from Google
    
    Returns:
        User model instance
    """
    # Try to find user by Google ID
    result = await db.execute(
        select(User).where(User.google_id == user_info["google_id"])
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Update user info if changed
        user.email = user_info["email"]
        user.name = user_info.get("name")
        user.avatar_url = user_info.get("picture")
        await db.commit()
        await db.refresh(user)
        return user
    
    # Create new user
    user = User(
        google_id=user_info["google_id"],
        email=user_info["email"],
        name=user_info.get("name"),
        avatar_url=user_info.get("picture"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
