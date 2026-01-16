# Authentication Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Failed to fetch" Error

**Symptoms**: OAuth callback succeeds (you see "Authentication Successful" in browser), but the sign-in page shows "Failed to fetch".

**Cause**: The backend server is not running or not accessible.

**Solution**:

1. **Check if backend is running**:
   ```bash
   # In a new terminal
   cd apps/backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Verify backend is accessible**:
   - Open: http://localhost:8000/health
   - Should return: `{"status": "ok", "app_name": "RabbitHole OS"}`

3. **Check API endpoint**:
   - Open: http://localhost:8000/api/v1/oauth/google/exchange
   - Should return 405 Method Not Allowed (expected - need POST)
   - If you get 404, check the router configuration

4. **Verify environment variables**:
   - Check `apps/backend/.env` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Check `apps/frontend/.env.local` has `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - Check `apps/frontend/.env.local` has `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

### Issue: "Cannot connect to backend" Error

**Symptoms**: Error message says "Cannot connect to backend server at http://localhost:8000".

**Solution**:

1. **Start the backend server**:
   ```bash
   cd apps/backend
   python -m uvicorn app.main:app --reload
   ```

2. **Check if port 8000 is in use**:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :8000
   
   # If in use, kill the process or change the port
   ```

3. **Check firewall**: Ensure localhost:8000 is not blocked

4. **Verify backend logs**: Look for errors in the backend console

### Issue: "Token exchange failed" Error

**Symptoms**: Backend is accessible, but token exchange with Google fails.

**Causes**:

1. **Missing environment variables**:
   - `GOOGLE_CLIENT_ID` not set in backend `.env`
   - `GOOGLE_CLIENT_SECRET` not set (though not strictly required for desktop apps)

2. **Wrong redirect URI**:
   - Redirect URI in backend doesn't match what was sent to Google
   - Should be: `http://127.0.0.1:53682/oauth/callback`

3. **Google OAuth client type mismatch**:
   - Using Web application client instead of Desktop app client

**Solution**:

1. **Verify Google Cloud Console**:
   - Ensure OAuth client type is **Desktop app**
   - Redirect URI is: `http://127.0.0.1:53682/oauth/callback`

2. **Check backend `.env`**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret  # Optional for desktop, but may be needed
   ```

3. **Check backend logs** for detailed error messages from Google

### Issue: "PKCE verifier not found" Error

**Symptoms**: Error says "PKCE verifier not found. Please try signing in again."

**Cause**: The code verifier stored in sessionStorage was cleared or expired.

**Solution**:

1. Clear browser/Electron app cache
2. Try signing in again (this will generate a new verifier)
3. Ensure you complete the OAuth flow within 10 minutes

### Issue: OAuth Callback Server Port in Use

**Symptoms**: Error: "Port 53682 is already in use. Trying next port..."

**Solution**:

1. **Change the port** in `.env.local`:
   ```bash
   NEXT_PUBLIC_OAUTH_PORT=53683
   ```

2. **Update Google Cloud Console** redirect URI to match new port:
   ```
   http://127.0.0.1:53683/oauth/callback
   ```

3. **Or kill the process using port 53682**:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :53682
   taskkill /PID <PID> /F
   ```

### Issue: Backend Import Errors

**Symptoms**: Backend fails to start with import errors (e.g., "ModuleNotFoundError: No module named 'redis'").

**Solution**:

1. **Install missing dependencies**:
   ```bash
   cd apps/backend
   pip install -r requirements.txt
   ```

2. **Common missing packages**:
   - `redis`
   - `pyjwt`
   - `cryptography`
   - `httpx`

### Issue: Database Connection Errors

**Symptoms**: Backend fails with database connection errors.

**Solution**:

1. **Check `DATABASE_URL`** in `apps/backend/.env`:
   ```bash
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database
   ```

2. **Run migrations**:
   ```bash
   cd apps/backend
   alembic upgrade head
   ```

3. **Verify database is accessible** from your network

### Issue: Redis Connection Errors

**Symptoms**: Backend fails with Redis connection errors (non-fatal, but affects session management).

**Solution**:

1. **Install and start Redis**:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Windows (WSL or Docker)
   wsl redis-server
   # or use Docker: docker run -d -p 6379:6379 redis
   ```

2. **Check `REDIS_URL`** in `apps/backend/.env`:
   ```bash
   REDIS_URL=redis://localhost:6379/0
   ```

3. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

**Note**: Redis is optional but recommended for production. The app will work without it, but session revocation won't work.

## Quick Diagnostic Checklist

1. ✅ Backend server is running (`http://localhost:8000/health` works)
2. ✅ Redis is running (optional, but recommended)
3. ✅ Database is accessible and migrations are run
4. ✅ Google OAuth client is **Desktop app** type
5. ✅ Redirect URI in Google Console: `http://127.0.0.1:53682/oauth/callback`
6. ✅ Environment variables are set correctly
7. ✅ Frontend `.env.local` has `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
8. ✅ Backend `.env` has `GOOGLE_CLIENT_ID`
9. ✅ Port 8000 is not blocked by firewall
10. ✅ Port 53682 is available (or change to another port)

## Debug Mode

To see more detailed error messages:

1. **Frontend**: Check browser console (F12) for detailed errors
2. **Backend**: Check terminal output for Python errors
3. **Electron**: Check main process console for IPC errors

## Still Having Issues?

1. Check backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all services are running:
   - Backend (port 8000)
   - Redis (port 6379, optional)
   - Database (Neon Postgres)
4. Try clearing all caches and restarting
5. Check network connectivity between Electron and backend
