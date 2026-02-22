/**
 * Retrieves the current access token from local storage.
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

/**
 * Retrieves the current refresh token from local storage.
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
};

/**
 * Saves both access and refresh tokens to local storage.
 */
export const setTokens = (access: string, refresh: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', access);
  localStorage.setItem('refresh_token', refresh);
  // Dispatch event so other components (like AuthGuard) can react
  window.dispatchEvent(new Event('auth-state-changed'));
};

/**
 * Clears authentication tokens from local storage, effectively logging the user out.
 */
export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  window.dispatchEvent(new Event('auth-state-changed'));
};
