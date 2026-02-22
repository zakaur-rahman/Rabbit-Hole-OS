/**
 * Authentication configuration
 * Supports both Electron desktop (deep link) and web browser flows.
 */

export const AUTH_CONFIG = {
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  
  // Web login URL — where the sign-in page lives (used by Electron to open system browser)
  WEB_BASE_URL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
  
  // OAuth redirect URI — Google redirects here after consent (web callback page)
  REDIRECT_URI: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/google',

  // Deep link protocol for desktop app
  DESKTOP_PROTOCOL: 'cognode',
  
  // API endpoints
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
  
  // OAuth scopes
  SCOPES: ['openid', 'profile', 'email'],
} as const;

/**
 * Detects if running in Electron desktop app
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Electron-specific objects (exposed via preload script)
  const electron = (window as typeof window & {
    electron?: unknown;
  }).electron;
  
  // Must have actual Electron API access
  return !!electron;
}

/**
 * Gets the redirect URI for web-based OAuth callback
 */
export function getRedirectUri(): string {
  return AUTH_CONFIG.REDIRECT_URI;
}
