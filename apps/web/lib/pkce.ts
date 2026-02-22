/**
 * Generates a random crypto-secure string for PKCE state and verifier
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Creates a SHA-256 hash of the input string and encodes it in Base64URL format
 */
export async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Base64URL encode the SHA-256 hash
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates the PKCE flow by generating and storing a verifier,
 * and returning the challenge and state to use in the authorization URL.
 */
export async function generatePKCEData() {
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  
  return {
    state,
    codeVerifier,
    codeChallenge
  };
}
