/**
 * Authentication API utilities
 */
import { AUTH_CONFIG } from './config';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Session {
  id: string;
  device_id: string | null;
  device_name: string | null;
  platform: string | null;
  app_version: string | null;
  user_agent: string | null;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  is_current: boolean;
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  // Only set Content-Type for requests with body
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If response is not ok, try to parse error message
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If we can't parse JSON, use the status text
    }
    throw new Error(errorMessage);
  }

  return response;
}

export async function getCurrentUser(): Promise<User> {
  const response = await authenticatedFetch(`${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/me`);
  return response.json();
}

export async function getSessions(): Promise<Session[]> {
  const response = await authenticatedFetch(`${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/sessions`);
  return response.json();
}

export async function revokeSession(sessionId: string): Promise<void> {
  await authenticatedFetch(
    `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/sessions/${sessionId}/revoke`,
    { method: 'POST' }
  );
}

export async function revokeAllSessions(): Promise<void> {
  await authenticatedFetch(
    `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/sessions/revoke-all`,
    { method: 'POST' }
  );
}
