# Google OAuth 2.0 Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `Cognode` (or your preferred name)
4. Click "Create"

## Step 2: Enable Google+ API

1. In the project, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "People API"
3. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `Cognode`
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Add `openid`, `profile`, `email`
   - Click **Save and Continue**
   - Test users: Add your email (for testing)
   - Click **Save and Continue**

4. Create OAuth Client:
   
   **Option A: Desktop app type (Recommended - no client_secret required)**
   - **Application type: Desktop app**
   - Name: `Cognode Desktop`
   - **Authorized redirect URIs**: Add:
     ```
     http://127.0.0.1:53682/oauth/callback
     ```
     **Important**: Use loopback redirect (Google recommended). Port 53682 is default but can be changed.
   - Click **Create**
   - **IMPORTANT**: Copy the **Client ID** (desktop apps don't use client secrets in OAuth flow)
   - Save the Client ID securely (you'll add it to `.env`)
   - **Note**: Desktop app type doesn't generate a client secret, which is fine - PKCE provides security
   
   **Option B: Web application type (Requires client_secret)**
   - **Application type: Web application**
   - Name: `Cognode Web`
   - **Authorized redirect URIs**: Add:
     ```
     http://127.0.0.1:53682/oauth/callback
     ```
   - Click **Create**
   - **IMPORTANT**: Copy BOTH the **Client ID** AND **Client Secret**
   - Save both securely (you'll add both to `.env`)
   - **Note**: Web application type requires client_secret even with PKCE

**Important**: 
- If you get "client_secret is missing" error, your OAuth client is configured as **Web application** type
- For Web application type, you MUST set `GOOGLE_CLIENT_SECRET` in your `.env` file
- For Desktop app type, client_secret is not needed (PKCE provides security)
- Loopback redirect (`http://127.0.0.1:PORT/callback`) works with both types
- See `LOOPBACK_REDIRECT_SETUP.md` for detailed setup instructions

## Step 4: Configure Desktop App Redirect URI

The `cognode://auth/callback` URI scheme will be handled by the Electron app.

**Note**: For production, you may need to:
- Register the custom URI scheme with the OS (handled by Electron)
- For macOS: Add to `Info.plist`
- For Windows: Add to registry during installation

## Step 5: Environment Variables

Add to your `.env` files:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# IMPORTANT: Set this if your OAuth client is "Web application" type
# Leave empty if using "Desktop app" type (which doesn't require client_secret)
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Configuration
OAUTH_REDIRECT_URI_WEB=https://auth.cognode.ai/oauth/google/callback
OAUTH_REDIRECT_URI_DESKTOP=cognode://auth/callback
```

## Step 6: Verify Setup

1. Test the OAuth flow in development
2. Ensure redirect URIs match exactly (including trailing slashes)
3. Verify scopes are correctly requested

## Security Notes

- **Never commit** `GOOGLE_CLIENT_SECRET` to version control
- Use environment variables for all secrets
- In production, restrict redirect URIs to your domains only
- Enable OAuth consent screen verification for production use
- Monitor OAuth usage in Google Cloud Console

## Troubleshooting

### "Redirect URI mismatch"
- Ensure redirect URIs in Google Console match exactly (case-sensitive)
- Check for trailing slashes
- Verify the custom URI scheme is registered

### "Access blocked: This app's request is invalid"
- Check OAuth consent screen is configured
- Verify scopes are enabled
- Ensure test users are added (for testing phase)

### "Invalid client"
- Verify `GOOGLE_CLIENT_ID` is correct
- Check the client is enabled in Google Console

### "client_secret is missing"
- **This error means your OAuth client is configured as "Web application" type (not "Desktop app" type)**
- **Solution**: Add `GOOGLE_CLIENT_SECRET` to your `.env` file:
  ```bash
  GOOGLE_CLIENT_SECRET=your-client-secret-here
  ```
- To get your client secret:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Navigate to **APIs & Services** → **Credentials**
  3. Click on your OAuth 2.0 Client ID
  4. Copy the **Client secret** value
  5. Add it to `apps/backend/.env` as `GOOGLE_CLIENT_SECRET=your-secret`
- **Alternative**: Reconfigure your OAuth client as "Desktop app" type (doesn't require client_secret)
  - Note: If you change the client type, you'll need to get a new Client ID
