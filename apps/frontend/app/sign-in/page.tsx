'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildGoogleOAuthURL, generateState, storePKCEVerifier } from '@/lib/auth/pkce';
import { AUTH_CONFIG, getRedirectUri, isElectron, getOAuthPort } from '@/lib/auth/config';
import { CognodeLogo } from '@/components/icons/cognode-logo';
import { X } from 'lucide-react';
import { getDeviceInfo } from '@/lib/auth/device';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!AUTH_CONFIG.GOOGLE_CLIENT_ID) {
        throw new Error('Google OAuth client ID is not configured');
      }

      const state = generateState();
      const redirectUri = getRedirectUri(); // Uses loopback redirect: http://127.0.0.1:53682/oauth/callback

      const { url, codeVerifier } = await buildGoogleOAuthURL({
        clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
        redirectUri,
        state,
        scopes: [...AUTH_CONFIG.SCOPES],
      });

      // Store verifier for later use
      storePKCEVerifier(codeVerifier, state);

      // Desktop-only: Open system browser for OAuth (Electron)
      // Uses loopback redirect (http://127.0.0.1:PORT/oauth/callback) - Google recommended
      if (!isElectron()) {
        throw new Error('This application only works in Electron desktop app. Please run in Electron.');
      }

      // Signal Electron to open browser and wait for loopback callback
      const electronAuth = (window as typeof window & {
        electron?: {
          auth?: {
            startLogin: (authUrl: string, port?: number) => Promise<{ code: string; state: string; error?: string }>;
          };
        };
      }).electron?.auth;

      if (!electronAuth?.startLogin) {
        throw new Error('Electron auth API not available. Please ensure the app is running in Electron.');
      }

      const port = getOAuthPort();

      // Start login - opens browser and waits for callback via loopback server
      // Returns callback directly (handled by Electron main process)
      const callback = await electronAuth.startLogin(url, port);

      if (callback.error) {
        throw new Error(callback.error);
      }

      if (!callback.code || !callback.state) {
        throw new Error('Invalid callback data received');
      }

      // First, check if backend is accessible (before attempting token exchange)
      const healthUrl = `${AUTH_CONFIG.API_BASE_URL}/health`;
      try {
        // Use a timeout promise for compatibility
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );

        const healthResponse = await Promise.race([
          fetch(healthUrl, { method: 'GET' }),
          timeoutPromise
        ]) as Response;

        if (!healthResponse.ok) {
          throw new Error(`Backend health check failed: HTTP ${healthResponse.status}`);
        }
        const healthData = await healthResponse.json();
        console.log('Backend health check passed:', healthData);
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        const errorMessage = healthError instanceof Error
          ? healthError.message
          : 'Unknown error';
        throw new Error(
          `Cannot connect to backend server at ${AUTH_CONFIG.API_BASE_URL}. ${errorMessage}. ` +
          `Please ensure the backend is running: cd apps/backend && python -m uvicorn app.main:app --reload`
        );
      }

      // Exchange code with backend
      const exchangeUrl = `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/google/exchange`;
      console.log('Exchanging code with backend:', exchangeUrl);

      let response: Response;
      try {
        response = await fetch(exchangeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: callback.code,
            code_verifier: codeVerifier,
            state: callback.state,
            redirect_uri: redirectUri,
            ...getDeviceInfo()
          }),
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(
          `Failed to connect to backend at ${exchangeUrl}. ` +
          `Please ensure the backend server is running. ` +
          `Error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        );
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Backend error:', errorData);
        throw new Error(errorData.detail || `Failed to exchange authorization code (HTTP ${response.status})`);
      }

      const data = await response.json();

      // Store tokens securely
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        window.dispatchEvent(new Event('auth-state-changed'));
      }

      // Authentication successful - redirect to home
      setIsLoading(false);
      router.push('/');
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start sign-in');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsLoading(false);
    setError(null);
    // Go back to home page or previous page
    router.push('/');
  };

  const handleExit = () => {
    // Desktop-only: Close window in Electron
    const electron = (window as typeof window & {
      electron?: {
        close?: () => void;
      };
    }).electron;

    if (electron?.close) {
      electron.close();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          {/* Close/Exit Button */}
          <button
            onClick={handleExit}
            className="absolute top-4 right-4 p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Logo and Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
              <CognodeLogo />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Cognode</h1>
            <p className="text-neutral-400 text-sm text-center">
              Sign in to continue to your AI research workspace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Cancel Button (shown when loading) */}
            {isLoading && (
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 text-neutral-400 hover:text-white text-sm font-medium rounded-lg border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-neutral-500">
            By continuing, you agree to Cognode&apos;s Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Additional Info */}
        <p className="mt-6 text-center text-sm text-neutral-600">
          Need help? <a href="#" className="text-green-400 hover:text-green-300">Contact Support</a>
        </p>
      </div>
    </div>
  );
}
