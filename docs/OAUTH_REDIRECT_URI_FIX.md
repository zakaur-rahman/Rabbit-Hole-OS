# Fix for Google OAuth "Error 400: invalid_request" - Redirect URI Issue

## Problem

When trying to sign in with Google OAuth, you're getting:
```
Error 400: invalid_request
redirect_uri=cognode://auth/callback
```

This happens because **Google OAuth does NOT accept custom URI schemes (`cognode://`) for web applications**. Custom URI schemes are only valid for:
- Native desktop applications (packaged Electron apps)
- Mobile applications

For web browsers, Google **requires HTTP/HTTPS URLs**.

## Solution

### Step 1: Add Localhost Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/auth/google/callback
   ```
5. For production, also add:
   ```
   https://auth.cognode.ai/oauth/google/callback
   ```
6. Click **Save**

**Important**: Keep `cognode://auth/callback` ONLY if you're building a native desktop app. For web development, you don't need it.

### Step 2: Verify Environment Variables

Make sure your frontend `.env.local` has:
```bash
NEXT_PUBLIC_OAUTH_REDIRECT_URI_WEB=http://localhost:3000/auth/google/callback
```

Or leave it unset - it will automatically use `http://localhost:3000/auth/google/callback` in development.

### Step 3: How It Works Now

- **Web Browser**: Uses `http://localhost:3000/auth/google/callback` (or your configured HTTPS URL)
- **Electron Desktop App**: Uses `cognode://auth/callback` (only when actually in Electron with API access)

The code now automatically detects the environment and uses the appropriate redirect URI.

### Step 4: Test

1. Make sure you've added `http://localhost:3000/auth/google/callback` to Google Cloud Console
2. Restart your frontend server
3. Try signing in again - it should now work!

## Why This Happened

The original code was using `cognode://auth/callback` for all scenarios, including web browsers. Google OAuth rejects custom URI schemes for web applications because:
1. Security: Custom URI schemes can be hijacked
2. Web standards: Web OAuth must use HTTP/HTTPS URLs
3. Browser support: Browsers handle HTTP redirects differently than desktop apps

## For Production

When deploying to production:
1. Use HTTPS: `https://yourdomain.com/auth/google/callback`
2. Add the HTTPS URL to Google Cloud Console
3. Update `NEXT_PUBLIC_OAUTH_REDIRECT_URI_WEB` to your production URL
4. Keep `cognode://auth/callback` only for the Electron desktop app
