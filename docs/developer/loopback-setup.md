# [DEPRECATED] Loopback Redirect Setup Guide

> [!CAUTION]
> This document describes a legacy loopback server architecture that is no longer used. Cognode has migrated to a Secure Deep Link PKCE flow. 
> Refer to [Authentication System (Current)](./authentication-system.md) instead.

## Overview

This application uses **loopback redirect** (`http://127.0.0.1:53682/oauth/callback`) for Google OAuth, which is the **Google-recommended approach** for desktop applications.

## Why Loopback Instead of Custom URI Scheme?

Google recommends loopback redirects for desktop apps because:

1. ✅ **No OS configuration needed** - No need to register custom URI schemes
2. ✅ **Works everywhere** - Compatible across all platforms
3. ✅ **Google-approved** - This is what Google uses in their own samples
4. ✅ **No special approvals** - Works immediately without Google verification
5. ✅ **Safer** - Google trusts loopback redirects more than custom schemes

## Google Cloud Console Setup

### Step 1: Create Desktop App OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. **Application type**: Select **Desktop app**
5. **Name**: `Cognode Desktop`
6. **Authorized redirect URIs**: Add:
   ```
   http://127.0.0.1:53682/oauth/callback
   ```
   **Important**: You can use any port number (53682 is default), but it must be `127.0.0.1` (localhost)

7. Click **Create**
8. Copy the **Client ID** (you don't need client secret for desktop apps)

### Step 2: Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Configure:
   - User Type: **External** (or Internal if Google Workspace)
   - App name: `Cognode`
   - User support email: Your email
   - Scopes: `openid`, `profile`, `email`
   - Test users: Add your email (for testing phase)

## Environment Variables

### Frontend (`.env.local` in `apps/frontend/`)

```bash
# Google OAuth Client ID (Desktop app)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Loopback redirect URI (default port 53682)
NEXT_PUBLIC_OAUTH_REDIRECT_URI_DESKTOP=http://127.0.0.1:53682/oauth/callback

# OAuth callback port (optional, defaults to 53682)
NEXT_PUBLIC_OAUTH_PORT=53682

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend (`.env` in `apps/backend/`)

```bash
# Google OAuth (Desktop app doesn't use client_secret in token exchange)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret  # Optional - only needed for ID token verification

# Loopback redirect URI
OAUTH_REDIRECT_URI_DESKTOP=http://127.0.0.1:53682/oauth/callback

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Database & Redis
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0
```

## How It Works

### 1. User Initiates Login

- User clicks "Continue with Google" in Electron app
- App generates PKCE code verifier and challenge
- App builds Google OAuth URL with loopback redirect

### 2. System Browser Opens

- Electron opens the system browser with Google OAuth URL
- Google shows the consent screen
- User authenticates with Google

### 3. Google Redirects to Loopback

- Google redirects to: `http://127.0.0.1:53682/oauth/callback?code=...&state=...`
- The Electron app has an HTTP server listening on port 53682
- The server receives the callback and extracts the authorization code

### 4. Token Exchange

- Electron sends the code to the backend
- Backend exchanges code for tokens (using PKCE, no client_secret)
- Backend creates user session and returns JWT tokens

### 5. Authentication Complete

- Tokens stored securely in Electron
- User is authenticated and redirected to the app

## Testing

### Start the App

1. **Start backend**:
   ```bash
   cd apps/backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start frontend**:
   ```bash
   cd apps/frontend
   npm run dev
   ```

3. **Start Electron**:
   ```bash
   cd apps/desktop
   npm run dev
   ```

### Test OAuth Flow

1. In Electron app, navigate to sign-in page
2. Click "Continue with Google"
3. System browser opens with Google OAuth
4. After authentication, check browser redirects to `http://127.0.0.1:53682/oauth/callback`
5. Electron app should receive the callback automatically
6. User should be authenticated

## Troubleshooting

### Port Already in Use

**Issue**: `EADDRINUSE` error on port 53682

**Solution**:
1. Change the port in `.env.local`: `NEXT_PUBLIC_OAUTH_PORT=53683`
2. Update Google Console redirect URI to match
3. Restart Electron app

### Callback Not Received

**Issue**: Browser redirects but Electron doesn't receive callback

**Solution**:
1. Check that the HTTP server is running: Look for "OAuth callback server listening" in logs
2. Verify port matches: Check `NEXT_PUBLIC_OAUTH_PORT` matches Google Console
3. Check firewall: Ensure localhost connections aren't blocked
4. Try different port: Some ports may be restricted

### "Invalid redirect_uri"

**Issue**: Google says redirect URI doesn't match

**Solution**:
1. Ensure exact match in Google Console: `http://127.0.0.1:53682/oauth/callback`
2. No trailing slash
3. Must be `127.0.0.1` (not `localhost`)
4. Port must match exactly

### "Access blocked" Error

**Issue**: Google blocks the OAuth request

**Solution**:
1. Ensure OAuth client type is **Desktop app** (NOT Web application)
2. Verify you're not including `client_secret` in the authorization URL
3. Ensure PKCE is enabled (code_challenge and code_challenge_method)
4. Check OAuth consent screen is configured
5. Add yourself as a test user (if in testing phase)

## Port Selection

The default port is **53682**, but you can use any available port:

- **Recommended range**: 49152-65535 (dynamic/private ports)
- **Avoid**: Well-known ports (1-1023) and registered ports (1024-49151)
- **Default**: 53682 (safe choice, unlikely to conflict)

To change port:
1. Update `NEXT_PUBLIC_OAUTH_PORT` in `.env.local`
2. Update redirect URI in Google Console
3. Restart Electron app

## Security Notes

1. ✅ **No client_secret exposure**: Desktop apps never send client_secret to Google
2. ✅ **PKCE required**: Always uses PKCE for security
3. ✅ **Loopback only**: Only accepts callbacks from localhost (127.0.0.1)
4. ✅ **Automatic cleanup**: Server closes after receiving callback
5. ✅ **Timeout protection**: Server times out after 5 minutes

## Production Deployment

### Building for Production

1. **Build Electron app**:
   ```bash
   cd apps/desktop
   npm run dist
   ```

2. **The loopback redirect works the same** in production - no changes needed!

3. **Port is dynamic**: If port is in use, the app will try the next available port

### Code Signing

For production, consider code signing:
- **Windows**: Sign the `.exe` for Windows Defender trust
- **macOS**: Sign the `.app` bundle for Gatekeeper trust
- **Linux**: Sign the AppImage or provide checksums

This ensures users trust your app when it makes localhost connections.

## Comparison: Loopback vs Custom URI Scheme

| Feature | Loopback (✅ Current) | Custom URI Scheme |
|---------|----------------------|-------------------|
| Google approval | ✅ Always works | ⚠️ May require verification |
| OS configuration | ✅ None needed | ❌ Requires registration |
| Development | ✅ Works immediately | ⚠️ Needs OS setup |
| Cross-platform | ✅ Same on all platforms | ⚠️ Different per OS |
| Google samples | ✅ Uses this | ❌ Doesn't use this |
| Security | ✅ Google trusts it | ⚠️ Google is stricter |

**Conclusion**: Loopback redirect is the safer, simpler, and Google-recommended approach.
