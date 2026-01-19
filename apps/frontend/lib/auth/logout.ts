/**
 * Logout utility functions
 */
import { AUTH_CONFIG } from './config';

export async function logout(): Promise<void> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
  
  if (!token) {
    // No token, just clear storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth-state-changed'));
    }
    return;
  }

  try {
    // Call logout endpoint
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Logout API call failed:', response.status);
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with logout even if API call fails
  } finally {
    // Always clear local storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('cached_user');
      window.dispatchEvent(new Event('auth-state-changed'));
    }
  }
}
