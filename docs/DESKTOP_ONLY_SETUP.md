# Desktop-Only OAuth Setup Guide

## Overview

This application is **desktop-only** and uses Electron with Google OAuth 2.0 via a custom URI scheme (`cognode://auth/callback`).

**Important**: This app does NOT support web browser OAuth. It only works in the Electron desktop app.

## Google Cloud Console Setup

### Step 1: Create OAuth 2.0 Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Configure OAuth consent screen if prompted:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `Cognode`
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `openid`, `profile`, `email`
   - Test users: Add your email (for testing)

### Step 2: Create Desktop Application Client

1. **Application type**: Select **Desktop app** (NOT Web application)
2. **Name**: `Cognode Desktop`
3. **Authorized redirect URIs**: Add:
   ```
   cognode://auth/callback
   ```
4. Click **Create**
5. Copy the **Client ID** (you'll need this, but NOT the client secret for desktop apps)

**Important Notes**:
- Desktop apps in Google OAuth **do not use client secrets** (for security)
- The redirect URI `cognode://auth/callback` is the custom URI scheme handled by Electron
- This URI scheme must be registered with the OS when the app is installed

## Environment Variables

### Frontend (`.env.local` in `apps/frontend/`)

```bash
# Google OAuth Client ID (Desktop app - no secret needed)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Desktop redirect URI (custom URI scheme)
NEXT_PUBLIC_OAUTH_REDIRECT_URI_DESKTOP=cognode://auth/callback

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend (`.env` in `apps/backend/`)

```bash
# Google OAuth - Desktop app doesn't use client secret in the OAuth flow
# But you may still need it for backend token verification
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret  # Optional for desktop, but may be needed for ID token verification

# Desktop redirect URI
OAUTH_REDIRECT_URI_DESKTOP=cognode://auth/callback

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Database & Redis
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0

# API
API_BASE_URL=http://localhost:8000
```

## Electron Custom URI Scheme

The custom URI scheme `cognode://` must be registered when the Electron app is installed:

### Windows

The URI scheme is registered in the Windows registry. Electron Builder handles this automatically when building the installer. Ensure your `package.json` has:

```json
{
  "build": {
    "nsis": {
      "include": "build/installer.nsh"
    }
  }
}
```

### macOS

The URI scheme is registered in `Info.plist`. Add to `apps/desktop/package.json`:

```json
{
  "build": {
    "mac": {
      "extendInfo": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLName": "Cognode Auth",
            "CFBundleURLSchemes": ["cognode"]
          }
        ]
      }
    }
  }
}
```

### Linux

Register via `.desktop` file. Electron Builder handles this automatically.

## Testing in Development

1. **Start the backend**:
   ```bash
   cd apps/backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start the frontend**:
   ```bash
   cd apps/frontend
   npm run dev
   ```

3. **Start Electron**:
   ```bash
   cd apps/desktop
   npm run dev
   ```

4. **Test the flow**:
   - In Electron app, navigate to sign-in page
   - Click "Continue with Google"
   - System browser opens for Google OAuth
   - After authentication, Google redirects to `cognode://auth/callback?code=...`
   - Electron captures this and handles the callback
   - Tokens are stored securely

## Troubleshooting

### "Error 400: invalid_request" with custom URI scheme

**Issue**: Google rejects `cognode://auth/callback`

**Solution**:
1. Ensure you created a **Desktop app** OAuth client (NOT Web application)
2. Verify `cognode://auth/callback` is in "Authorized redirect URIs"
3. Make sure the OAuth client type is set to "Desktop app" in Google Console

### "This app's request is invalid"

**Issue**: OAuth consent screen not configured or app not verified

**Solution**:
1. Complete OAuth consent screen configuration
2. Add yourself as a test user (if in testing phase)
3. Verify scopes are enabled: `openid`, `profile`, `email`

### Custom URI scheme not working

**Issue**: `cognode://auth/callback` doesn't open Electron app

**Solution**:
1. Ensure Electron is running
2. Check that the URI scheme is registered (see Electron setup above)
3. On Windows, you may need to rebuild/install the app for registry changes
4. Test the URI manually: Try opening `cognode://auth/callback?test=1` in a browser

### Electron auth API not available

**Issue**: `window.electron.auth` is undefined

**Solution**:
1. Ensure preload script is loaded correctly
2. Check `apps/desktop/electron/preload.ts` exposes the auth API
3. Verify `contextIsolation: true` and `nodeIntegration: false` in main.ts
4. Rebuild Electron: `cd apps/desktop && npm run build`

## Production Deployment

### Desktop App Distribution

1. **Build the app**:
   ```bash
   cd apps/desktop
   npm run dist
   ```

2. **The installer will automatically register** the `cognode://` URI scheme

3. **Code signing** (recommended):
   - Windows: Code sign the `.exe`
   - macOS: Code sign the `.app` bundle
   - This ensures the OS trusts your URI scheme

### Google OAuth Verification

For production, you may need to:
1. **Submit OAuth consent screen for verification** (if using external users)
2. **Update redirect URIs** to match your production app
3. **Add privacy policy and terms of service URLs**

## Key Differences from Web OAuth

1. **No client secret in OAuth flow**: Desktop apps don't send client secret to Google
2. **Custom URI scheme**: Uses `cognode://` instead of `https://`
3. **System browser**: Opens default browser for OAuth (not in-app)
4. **OS registration**: URI scheme must be registered with the operating system

## Security Considerations

1. **No client secret exposure**: Desktop apps never expose client secrets
2. **PKCE required**: Always uses PKCE for additional security
3. **Token storage**: Should use OS keychain (not localStorage)
4. **HTTPS for backend**: All backend API calls should use HTTPS in production
