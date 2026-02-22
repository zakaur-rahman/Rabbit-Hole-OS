/**
 * Electron-specific authentication helpers (deep link flow)
 * 
 * With the new auth architecture, the sign-in page handles the full flow:
 * 1. Opens system browser to web login URL
 * 2. Listens for deep link callback (cognode://auth/callback?code=...)
 * 3. Exchanges the one-time code with POST /oauth/desktop/exchange
 * 
 * This file provides utility functions for legacy compatibility.
 */

import { AUTH_CONFIG } from './config';

/**
 * Exchange a one-time desktop auth code with the backend
 */
export async function exchangeDesktopCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: any;
}> {
  const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/desktop/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to exchange desktop auth code');
  }

  const data = await response.json();

  // Store tokens
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    window.dispatchEvent(new Event('auth-state-changed'));
  }

  return data;
}
