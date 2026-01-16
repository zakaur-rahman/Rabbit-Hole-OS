/**
 * PKCE (Proof Key for Code Exchange) utilities
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow
 */

/**
 * Generates a cryptographically random code verifier
 * @returns Base64URL-encoded string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generates a code challenge from a code verifier using SHA256
 * @param verifier - The code verifier
 * @returns Base64URL-encoded SHA256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Base64URL encoding (RFC 4648 §5)
 * Replaces '+' with '-', '/' with '_', and removes padding
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Stores PKCE verifier temporarily in sessionStorage
 * @param verifier - The code verifier to store
 * @param state - The OAuth state parameter
 */
export function storePKCEVerifier(verifier: string, state: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `pkce_verifier_${state}`;
  sessionStorage.setItem(key, verifier);
  
  // Clean up after 10 minutes (OAuth codes expire quickly)
  setTimeout(() => {
    sessionStorage.removeItem(key);
  }, 10 * 60 * 1000);
}

/**
 * Retrieves and removes PKCE verifier from sessionStorage
 * @param state - The OAuth state parameter
 * @returns The code verifier or null if not found
 */
export function getPKCEVerifier(state: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const key = `pkce_verifier_${state}`;
  const verifier = sessionStorage.getItem(key);
  
  if (verifier) {
    sessionStorage.removeItem(key);
  }
  
  return verifier;
}

/**
 * Generates a cryptographically random state parameter for CSRF protection
 * @returns Base64URL-encoded string
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Builds Google OAuth 2.0 authorization URL with PKCE
 * @param params - OAuth parameters
 * @returns Complete authorization URL
 */
export async function buildGoogleOAuthURL(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): Promise<{ url: string; codeVerifier: string }> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const scopes = params.scopes || ['openid', 'profile', 'email'];
  
  // Build Google OAuth URL for Desktop app (Installed App flow)
  // Desktop apps use PKCE and do NOT include client_secret
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  
  // Desktop app - DO NOT include:
  // - client_secret (not used in desktop apps)
  // - response_mode (web-only parameter)
  // - other web-only parameters
  
  return {
    url: url.toString(),
    codeVerifier,
  };
}
