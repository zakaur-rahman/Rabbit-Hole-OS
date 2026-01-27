/**
 * Authentication configuration
 * Desktop-only: This app only supports Electron desktop authentication
 */

export const AUTH_CONFIG = {
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  
  // OAuth redirect URI - Desktop only (loopback redirect - Google recommended)
  // Using loopback instead of custom URI scheme for better compatibility
  REDIRECT_URI: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI_DESKTOP || 'http://127.0.0.1:53682/oauth/callback',
  
  // Loopback server port (default 53682, can be changed via env)
  OAUTH_PORT: parseInt(process.env.NEXT_PUBLIC_OAUTH_PORT || '53682', 10),
  
  // API endpoints
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
  
  // OAuth scopes
  SCOPES: ['openid', 'profile', 'email'],
} as const;

/**
 * Detects if running in Electron desktop app
 * Desktop-only: This app is designed for Electron, so always check for Electron API
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
 * Gets the redirect URI for Electron desktop app
 * Desktop-only: Returns loopback redirect URI (Google recommended for desktop apps)
 */
export function getRedirectUri(): string {
  return AUTH_CONFIG.REDIRECT_URI;
}

/**
 * Gets the OAuth callback port
 */
export function getOAuthPort(): number {
  return AUTH_CONFIG.OAUTH_PORT;
}
