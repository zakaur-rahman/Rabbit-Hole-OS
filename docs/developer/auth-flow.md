# [DEPRECATED] Authentication Flow Diagram

> [!CAUTION]
> This document is outdated. Please refer to [Authentication System (Current)](./authentication-system.md) for the modern PKCE deep-link architecture.

## Desktop App Flow (Electron)

```
┌─────────────┐
│   Electron   │
│     App      │
└──────┬───────┘
       │
       │ 1. User clicks "Sign in with Google"
       │
       ▼
┌─────────────────────────────────┐
│ Generate PKCE:                   │
│ - code_verifier (random)         │
│ - code_challenge (SHA256)        │
│ - state (CSRF token)             │
└──────┬──────────────────────────┘
       │
       │ 2. Store verifier in sessionStorage
       │
       ▼
┌─────────────────────────────────┐
│ Open system browser with:       │
│ https://accounts.google.com/... │
│ ?client_id=...                   │
│ &redirect_uri=cognode://auth/... │
│ &code_challenge=...              │
│ &state=...                       │
└──────┬──────────────────────────┘
       │
       │ 3. User authenticates with Google
       │
       ▼
┌─────────────────────────────────┐
│ Google redirects to:            │
│ cognode://auth/callback?         │
│ code=AUTH_CODE&state=STATE      │
└──────┬──────────────────────────┘
       │
       │ 4. Electron handles custom URI
       │
       ▼
┌─────────────────────────────────┐
│ Retrieve code_verifier from     │
│ sessionStorage using state       │
└──────┬──────────────────────────┘
       │
       │ 5. Send to backend
       │
       ▼
┌─────────────────────────────────┐
│ POST /api/v1/oauth/google/       │
│ exchange                         │
│ {                                │
│   code: AUTH_CODE,               │
│   code_verifier: VERIFIER,       │
│   state: STATE                   │
│ }                                │
└──────┬──────────────────────────┘
       │
       │ 6. Backend exchanges code
       │
       ▼
┌─────────────────────────────────┐
│ Backend:                         │
│ 1. Exchange code with Google      │
│ 2. Verify ID token                │
│ 3. Create/update user            │
│ 4. Create session                 │
│ 5. Generate JWT tokens           │
└──────┬──────────────────────────┘
       │
       │ 7. Return tokens
       │
       ▼
┌─────────────────────────────────┐
│ Store tokens securely:           │
│ - Access token (1 hour)          │
│ - Refresh token (30 days)        │
│ Use OS keychain in Electron      │
└─────────────────────────────────┘
```

## Web Flow (Next.js)

```
┌─────────────┐
│   Browser    │
└──────┬───────┘
       │
       │ 1. Navigate to /sign-in
       │
       ▼
┌─────────────────────────────────┐
│ Generate PKCE:                   │
│ - code_verifier                  │
│ - code_challenge                 │
│ - state                          │
└──────┬──────────────────────────┘
       │
       │ 2. Store in sessionStorage
       │
       ▼
┌─────────────────────────────────┐
│ Redirect to Google OAuth:       │
│ https://accounts.google.com/... │
│ ?redirect_uri=https://auth...    │
│ &code_challenge=...              │
└──────┬──────────────────────────┘
       │
       │ 3. User authenticates
       │
       ▼
┌─────────────────────────────────┐
│ Google redirects to:            │
│ /auth/google/callback?           │
│ code=AUTH_CODE&state=STATE      │
└──────┬──────────────────────────┘
       │
       │ 4. Retrieve verifier
       │
       ▼
┌─────────────────────────────────┐
│ POST /api/v1/oauth/google/      │
│ exchange                         │
└──────┬──────────────────────────┘
       │
       │ 5. Backend processes
       │
       ▼
┌─────────────────────────────────┐
│ Store tokens and redirect to /  │
└─────────────────────────────────┘
```

## Token Refresh Flow

```
┌─────────────┐
│   Client     │
└──────┬───────┘
       │
       │ 1. Access token expired
       │
       ▼
┌─────────────────────────────────┐
│ POST /api/v1/oauth/refresh      │
│ { refresh_token: TOKEN }         │
└──────┬──────────────────────────┘
       │
       │ 2. Backend verifies token
       │
       ▼
┌─────────────────────────────────┐
│ Backend:                         │
│ 1. Verify refresh token          │
│ 2. Check if revoked (Redis)      │
│ 3. Verify session exists         │
│ 4. Revoke old token (rotation)   │
│ 5. Generate new access token     │
└──────┬──────────────────────────┘
       │
       │ 3. Return new access token
       │
       ▼
┌─────────────────────────────────┐
│ Update stored access token       │
└─────────────────────────────────┘
```

## Security Features

1. **PKCE**: Prevents authorization code interception
2. **State Parameter**: CSRF protection
3. **Token Rotation**: Refresh tokens are rotated on use
4. **Token Revocation**: Revoked tokens tracked in Redis
5. **Session Management**: Sessions tracked in database
6. **HTTPS Only**: All production traffic encrypted
7. **JWT Expiration**: Short-lived access tokens
8. **Secure Storage**: OS keychain in Electron
