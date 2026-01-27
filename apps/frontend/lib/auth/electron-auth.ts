/**
 * Electron-specific authentication handlers
 */
import { getPKCEVerifier } from './pkce';

// Types are now handled in apps/frontend/types/electron.ts


/**
 * Handles OAuth callback in Electron
 */
export async function handleElectronAuthCallback(
  code: string,
  state: string
): Promise<void> {
  const codeVerifier = getPKCEVerifier(state);
  
  if (!codeVerifier) {
    throw new Error('PKCE verifier not found. Please try signing in again.');
  }

  // Send to Electron main process
  if (window.electron?.auth?.handleCallback) {
    await window.electron.auth.handleCallback({
      code,
      state,
      codeVerifier,
    });
  } else {
    // Fallback: send directly to backend
    await exchangeCodeWithBackend(code, codeVerifier, state);
  }
}

/**
 * Exchange authorization code with backend (desktop-only fallback)
 */
async function exchangeCodeWithBackend(
  code: string,
  codeVerifier: string,
  state: string
): Promise<void> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
  
  // Desktop-only: Use loopback redirect (Google recommended)
  const redirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI_DESKTOP || 'http://127.0.0.1:53682/oauth/callback';
  
  const response = await fetch(`${API_BASE_URL}/api/v1/oauth/google/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      state,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to exchange authorization code');
  }

  const data = await response.json();
  
  // Store tokens securely (Electron should use OS keychain)
  // For now, we'll use sessionStorage as a fallback
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('auth_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    // Notify app of auth change
    window.dispatchEvent(new Event('auth-state-changed'));
  }
}

/**
 * Setup Electron auth callback listener
 */
export function setupElectronAuthListener(
  onSuccess: () => void,
  onError: (error: string) => void
): () => void {
  if (!window.electron?.auth?.onCallback) {
    return () => {};
  }

  return window.electron.auth.onCallback(async (data) => {
    if (data.error) {
      onError(data.error);
      return;
    }

    if (data.code && data.state) {
      try {
        await handleElectronAuthCallback(data.code, data.state);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Authentication failed');
      }
    }
  });
}
