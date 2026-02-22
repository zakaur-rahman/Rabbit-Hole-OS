import { getToken, getRefreshToken, setTokens, clearTokens } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that automatically handles:
 * - Base URL resolution
 * - Injecting the `Authorization: Bearer` access token
 * - Automatic retry on 401 Unauthorized using the refresh token
 */
export async function apiFetch(endpoint: string, options: ApiOptions = {}): Promise<Response> {
  const { requireAuth = true, headers, ...customConfig } = options;

  let token = getToken();

  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (requireAuth && token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, config);

  // Intercept 401 Unauthorized to attempt token refresh
  if (response.status === 401 && requireAuth) {
    const refresh_token = getRefreshToken();

    if (refresh_token) {
      try {
        // Attempt to get a new access token
        const refreshResponse = await fetch(`${API_BASE_URL}/oauth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Update tokens in session storage
          setTokens(data.access_token, data.refresh_token);

          // Retry the original request with the new token
          (config.headers as Record<string, string>)['Authorization'] = `Bearer ${data.access_token}`;
          response = await fetch(url, config);
        } else {
          // Refresh failed (e.g., token expired or revoked)
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else {
      // No refresh token available, force logout
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}
