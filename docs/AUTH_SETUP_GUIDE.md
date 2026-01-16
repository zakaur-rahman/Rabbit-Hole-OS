# Authentication System Setup Guide

Complete guide to setting up the Cognode authentication system.

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon Postgres recommended)
- Redis server
- Google Cloud account

## Step 1: Google OAuth Setup

Follow the instructions in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to:
1. Create Google Cloud project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure redirect URIs

## Step 2: Database Setup

### 2.1 Create Neon Postgres Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string

### 2.2 Run Migrations

```bash
cd apps/backend
alembic upgrade head
```

This will create the `users` and `sessions` tables.

## Step 3: Redis Setup

### 3.1 Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL.

### 3.2 Verify Redis

```bash
redis-cli ping
# Should return: PONG
```

## Step 4: Backend Configuration

### 4.1 Create `.env` file

Create `apps/backend/.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Redirect URIs
OAUTH_REDIRECT_URI_WEB=https://auth.cognode.ai/oauth/google/callback
OAUTH_REDIRECT_URI_DESKTOP=cognode://auth/callback

# JWT Configuration
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=

# Project
PROJECT_NAME=Cognode
```

### 4.2 Install Python Dependencies

```bash
cd apps/backend
pip install -r requirements.txt
```

### 4.3 Generate JWT Secret Key

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and set it as `JWT_SECRET_KEY` in your `.env` file.

### 4.4 Run Backend

```bash
cd apps/backend
python -m uvicorn app.main:app --reload
```

Backend should be running at `http://localhost:8000`

## Step 5: Frontend Configuration

### 5.1 Create `.env.local` file

Create `apps/frontend/.env.local`:

```bash
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# OAuth Redirect URIs
NEXT_PUBLIC_OAUTH_REDIRECT_URI_WEB=https://auth.cognode.ai/oauth/google/callback
NEXT_PUBLIC_OAUTH_REDIRECT_URI_DESKTOP=cognode://auth/callback

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 5.2 Install Dependencies

```bash
cd apps/frontend
npm install
```

### 5.3 Run Frontend

```bash
npm run dev
```

Frontend should be running at `http://localhost:3000`

## Step 6: Electron Desktop App

### 6.1 Install Dependencies

```bash
cd apps/desktop
npm install
```

### 6.2 Build Electron

```bash
npm run build
```

### 6.3 Register Custom URI Scheme

The custom URI scheme `cognode://` is automatically registered when the app runs.

**macOS:** The scheme is registered in `Info.plist` (handled by electron-builder)

**Windows:** The scheme is registered in the registry during installation

**Linux:** The scheme is registered via `.desktop` file

### 6.4 Run Electron App

```bash
npm run dev
```

## Step 7: Testing the Auth Flow

### 7.1 Web Flow

1. Navigate to `http://localhost:3000/sign-in`
2. Click "Continue with Google"
3. Complete Google OAuth
4. Redirected back to app with tokens

### 7.2 Desktop Flow

1. Open Electron app
2. Navigate to sign-in page
3. Click "Continue with Google"
4. System browser opens for OAuth
5. After auth, callback URL (`cognode://auth/callback?code=...`) is handled by Electron
6. Tokens are stored securely

## Step 8: API Testing

### 8.1 Exchange Code (Web)

```bash
curl -X POST http://localhost:8000/api/v1/oauth/google/exchange \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code",
    "code_verifier": "pkce_code_verifier",
    "state": "csrf_state"
  }'
```

### 8.2 Get Current User

```bash
curl http://localhost:8000/api/v1/oauth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 8.3 Refresh Token

```bash
curl -X POST http://localhost:8000/api/v1/oauth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### 8.4 Logout

```bash
curl -X POST http://localhost:8000/api/v1/oauth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### "Redirect URI mismatch"

- Ensure redirect URIs in Google Console match exactly (case-sensitive)
- Check for trailing slashes
- Verify custom URI scheme is registered

### "Invalid client"

- Verify `GOOGLE_CLIENT_ID` is correct
- Check client is enabled in Google Console

### "Database connection failed"

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure SSL is enabled for Neon

### "Redis connection failed"

- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` is correct
- Ensure Redis is accessible

### "JWT decode error"

- Verify `JWT_SECRET_KEY` is set
- Ensure same secret is used for encoding/decoding
- Check token hasn't expired

## Security Checklist

- [ ] Strong JWT secret key (32+ characters, random)
- [ ] HTTPS in production
- [ ] Google OAuth client secret secured
- [ ] Database credentials secured
- [ ] Redis password set (if exposed)
- [ ] Refresh token rotation enabled
- [ ] Token expiration configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables not committed to git

## Production Deployment

### Backend

1. Set strong `JWT_SECRET_KEY`
2. Use production database URL
3. Configure production Redis
4. Set proper CORS origins
5. Enable HTTPS
6. Set up monitoring/logging

### Frontend

1. Set production API URL
2. Configure production redirect URIs
3. Build for production: `npm run build`
4. Deploy to hosting (Vercel, Netlify, etc.)

### Electron

1. Build for production: `npm run dist`
2. Code sign the application
3. Test custom URI scheme registration
4. Distribute installer

## Next Steps

- Implement token refresh in frontend
- Add session management UI
- Implement "Logout from all devices"
- Add audit logging
- Set up monitoring and alerts
