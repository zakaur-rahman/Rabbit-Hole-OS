'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildGoogleOAuthURL, generateState, storePKCEVerifier } from '@/lib/auth/pkce';
import { AUTH_CONFIG, getRedirectUri, isElectron } from '@/lib/auth/config';
import { CognodeLogo } from '@/components/icons/cognode-logo';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';
import { getDeviceInfo } from '@/lib/auth/device';
import { motion, AnimatePresence } from 'framer-motion';

function SignInContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkCleanup = useRef<(() => void) | null>(null);

  const source = searchParams.get('source');
  const deviceId = searchParams.get('device_id');
  const isDesktopSource = source === 'desktop';

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (isElectron() && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleGoogleSignIn();
    }

    // Notice: We do NOT aggressively cleanup `deepLinkCleanup.current()` here
    // because React Strict Mode will unmount/remount instantly and destroy
    // the IPC listener before the user can authenticate in their browser.
    return () => {
      // Intentionally omit the `deepLinkCleanup.current()` call on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!AUTH_CONFIG.GOOGLE_CLIENT_ID) {
        throw new Error('Google OAuth client ID is not configured');
      }

      if (isElectron()) {
        const electronAuth = (window as typeof window & {
          electron?: {
            auth?: {
              openLogin: (loginUrl: string) => Promise<void>;
              onDeepLinkAuth: (callback: (data: { code: string }) => void) => () => void;
            };
          };
        }).electron?.auth;

        if (!electronAuth?.openLogin || !electronAuth?.onDeepLinkAuth) {
          throw new Error('Electron auth API not available. Please ensure the app is running correctly.');
        }

        const currentDeviceId = localStorage.getItem('device_id') || crypto.randomUUID();
        localStorage.setItem('device_id', currentDeviceId);

        const loginUrl = new URL(`${AUTH_CONFIG.WEB_BASE_URL}/login`);
        loginUrl.searchParams.set('source', 'desktop');
        loginUrl.searchParams.set('device_id', currentDeviceId);
        loginUrl.searchParams.set('redirect_uri', `${AUTH_CONFIG.DESKTOP_PROTOCOL}://auth/callback`);

        const codePromise = new Promise<string>((resolve, reject) => {
          console.log('[SignIn] Setting up onDeepLinkAuth IPC listener...');
          const timeout = setTimeout(() => {
            console.log('[SignIn] Login timeout reached.');
            reject(new Error('Login timed out. Please try again.'));
          }, 5 * 60 * 1000);

          deepLinkCleanup.current = electronAuth.onDeepLinkAuth(({ code }) => {
            console.log('[SignIn] Raw onDeepLinkAuth triggered! Code received:', code);
            clearTimeout(timeout);
            resolve(code);
          });
          console.log('[SignIn] IPC listener attached.');
        });

        console.log('[SignIn] Opening login URL in system browser:', loginUrl.toString());
        await electronAuth.openLogin(loginUrl.toString());
        console.log('[SignIn] Awaiting deep link callback resolve...');

        const desktopCode = await codePromise;
        console.log('[SignIn] Resolved desktop code:', desktopCode);

        const exchangeUrl = `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/desktop/exchange`;
        console.log('[SignIn] Exchanging code locally with backend at:', exchangeUrl);

        const response = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: desktopCode,
            ...getDeviceInfo()
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: 'Exchange failed' }));
          console.error('[SignIn] Backend returned an error:', errData);
          throw new Error(errData.detail || `Desktop exchange failed (HTTP ${response.status})`);
        }

        const data = await response.json();
        console.log('[SignIn] Successfully exchanged token! Syncing to localStorage.');

        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        window.dispatchEvent(new Event('auth-state-changed'));

        setIsLoading(false);
        router.push('/');
        return;
      }

      const state = generateState();
      const redirectUri = getRedirectUri();

      const { url, codeVerifier } = await buildGoogleOAuthURL({
        clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
        redirectUri,
        state,
        scopes: [...AUTH_CONFIG.SCOPES],
      });

      storePKCEVerifier(codeVerifier, state);

      if (isDesktopSource && deviceId) {
        localStorage.setItem(`desktop_context_${state}`, JSON.stringify({
          device_id: deviceId,
          redirect_protocol: AUTH_CONFIG.DESKTOP_PROTOCOL,
        }));
      }

      window.location.href = url;
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start sign-in');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsLoading(false);
    setError(null);
    if (deepLinkCleanup.current) {
      deepLinkCleanup.current();
      deepLinkCleanup.current = null;
    }
    router.push('/');
  };

  const handleExit = () => {
    const electron = (window as typeof window & { electron?: { close?: () => void; }; }).electron;
    if (electron?.close) {
      electron.close();
    } else {
      router.push('/');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as const }}
      className="w-full max-w-md relative z-10"
    >
      {/* Ambient Glow */}
      <div className="absolute -inset-0.5 bg-linear-to-br from-green-500/30 to-emerald-700/30 rounded-[32px] blur-2xl opacity-50 z-0"></div>

      <div className="relative bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden">

        {/* Subtle top inner gradient */}
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

        <button
          onClick={handleExit}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-all hover:rotate-90"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center mb-10 pt-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-[20px] bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/20"
          >
            <CognodeLogo />
          </motion.div>
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-3 tracking-tight"
          >
            Welcome to Cognode
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-neutral-400 text-sm text-center max-w-[280px]"
          >
            {isDesktopSource
              ? 'Securely connect your desktop application to continue.'
              : 'Sign in to access your ultimate AI research workspace.'}
          </motion.p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full group relative flex items-center justify-center px-4 py-4 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold rounded-2xl transition-all disabled:opacity-70 disabled:scale-[0.98]"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin" />
                <span>{isElectron() ? 'Awaiting browser...' : 'Connecting securely...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            )}
          </button>

          {isLoading && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleCancel}
              className="w-full px-4 py-3 text-neutral-400 hover:text-white text-sm font-medium rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              Cancel Request
            </motion.button>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-neutral-500 font-medium"
        >
          By continuing, you agree to Cognode&apos;s <span className="text-neutral-400 hover:text-white cursor-pointer transition-colors">Terms</span> and <span className="text-neutral-400 hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
        </motion.p>
      </div>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-sm text-neutral-500 font-medium tracking-wide"
      >
        Need help? <a href="#" className="text-green-400 hover:text-green-300 transition-colors">Contact Support</a>
      </motion.p>
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 rounded-full blur-[150px]" />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md relative flex justify-center py-20 z-10">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      }>
        <SignInContent />
      </Suspense>
    </div>
  );
}
