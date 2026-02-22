/**
 * Authentication utilities for Electron desktop app.
 * 
 * With the deep link flow, auth is handled by:
 * 1. Opening the web login page in the system browser
 * 2. Receiving the deep link callback (cognode://auth/callback?code=...)
 * 3. Exchanging the one-time code with the backend
 * 
 * The old loopback HTTP server (oauth-server.ts) is no longer needed.
 */

// No-op export for backward compatibility during transition
export function stopOAuthServer(): void {
  // Deep link flow — no server to stop
}
