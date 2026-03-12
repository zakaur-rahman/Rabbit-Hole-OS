'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildGoogleOAuthURL, generateState, storePKCEVerifier } from '@/lib/auth/pkce';
import { AUTH_CONFIG, getRedirectUri, isElectron } from '@/lib/auth/config';
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

  const autoStartParam = searchParams.get('auto');
  const shouldAutoStart = autoStartParam !== 'false';

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (isElectron() && !hasAutoStarted.current && shouldAutoStart) {
      hasAutoStarted.current = true;
      handleGoogleSignIn();
    }

    return () => {
      // Intentionally omit cleanup on unmount for React Strict Mode compatibility with deep links
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
          const timeout = setTimeout(() => {
            reject(new Error('Login timed out. Please try again.'));
          }, 5 * 60 * 1000);

          deepLinkCleanup.current = electronAuth.onDeepLinkAuth(({ code }) => {
            clearTimeout(timeout);
            resolve(code);
          });
        });

        await electronAuth.openLogin(loginUrl.toString());
        const desktopCode = await codePromise;

        const exchangeUrl = `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/desktop/exchange`;
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
          throw new Error(errData.detail || `Desktop exchange failed (HTTP ${response.status})`);
        }

        const data = await response.json();
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
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-[380px] bg-(--surface)/80 backdrop-blur-xl border border-(--border2) rounded-[18px] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_32px_80px_rgba(0,0,0,0.75),0_8px_24px_rgba(0,0,0,0.5)]"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-(--amber) to-transparent z-20" />

      {/* Close button */}
      <button
        onClick={handleExit}
        className="absolute top-[14px] right-[14px] w-[26px] h-[26px] rounded-[6px] border border-(--border) bg-(--raised) text-(--muted) grid place-items-center text-[14px] cursor-pointer transition-all hover:bg-red-500/12 hover:border-red-500/30 hover:text-red-500 z-20 leading-none"
      >
        ×
      </button>

      {/* Top Content */}
      <div className="pt-[44px] px-[32px] pb-[28px] flex flex-col items-center gap-[20px] bg-linear-to-b from-(--raised)/80 to-transparent border-b border-(--border)">
        {/* App Icon */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
          className="w-[64px] h-[64px] rounded-[16px] bg-(--amber) grid place-items-center shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_8px_32px_rgba(232,160,32,0.35),0_2px_8px_rgba(0,0,0,0.4)] relative"
        >
          {/* Custom Mark */}
          <div className="w-[32px] h-[32px] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-14 border-l-transparent border-r-14 border-r-transparent border-b-24 border-b-[rgba(10,9,8,0.7)]" />
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[8px] h-[8px] rounded-full bg-[rgba(10,9,8,0.5)] border-[1.5px] border-white/30" />
          </div>
        </motion.div>

        <div className="text-center">
          <h1 className="text-[22px] font-extrabold tracking-tight text-(--text) mb-[6px]">Welcome to Cognode</h1>
          <p className="text-[12px] font-normal text-(--sub) leading-relaxed max-w-[240px] mx-auto">
            {isDesktopSource
              ? 'Securely connect your desktop application to continue.'
              : 'Sign in to access your AI research workspace'}
          </p>
        </div>
      </div>

      {/* Body Actions */}
      <div className="p-[22px_24px_20px] flex flex-col gap-[10px]">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 mb-2"
            >
              <span className="text-red-400 text-[11px] leading-relaxed">{error}</span>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-[46px] bg-(--raised) border border-(--border2) rounded-[10px] flex items-center justify-center gap-[12px] relative overflow-hidden group"
            >
              {/* Shimmer */}
              <motion.div
                animate={{ left: ['-60%', '160%'] }}
                transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                className="absolute top-0 w-[60%] h-full bg-linear-to-r from-transparent via-(--amber)/6 to-transparent pointer-events-none"
              />
              <div className="w-[16px] h-[16px] rounded-full border-2 border-(--border2) border-t-(--amber) animate-spin shrink-0" />
              <span className="font-mono text-[12px] text-(--sub) font-semibold select-none">Awaiting browser...</span>
            </motion.div>
          ) : (
            <motion.button
              key="signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleGoogleSignIn}
              className="w-full h-[46px] bg-(--amber) border-none rounded-[10px] flex items-center justify-center gap-[10px] text-[13px] font-bold text-(--bg) cursor-pointer tracking-wide shadow-[0_4px_20px_rgba(232,160,32,0.3)] transition-all hover:bg-(--amber2) hover:shadow-[0_4px_28px_rgba(232,160,32,0.45)] hover:-translate-y-px active:translate-y-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" opacity="0.8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" opacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" opacity="0.8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Sign in with Browser</span>
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={isLoading ? handleCancel : handleExit}
          className="w-full h-[42px] bg-transparent border border-(--border) rounded-[10px] flex items-center justify-center text-[12px] font-semibold text-(--sub) cursor-pointer transition-all hover:bg-(--raised) hover:border-(--border2) hover:text-(--text)"
        >
          {isLoading ? 'Cancel Request' : 'Exit Sign In'}
        </button>
      </div>

      {/* Footer */}
      <div className="p-[14px_24px_18px] border-t border-(--border) text-center bg-linear-to-b from-transparent to-[#12100e]/50">
        <p className="font-mono text-[10px] text-(--muted) leading-relaxed tracking-tight">
          By continuing, you agree to Cognode&apos;s{' '}
          <a href="#" className="text-(--amber) font-medium hover:text-(--amber2) transition-colors">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-(--amber) font-medium hover:text-(--amber2) transition-colors">Privacy Policy</a>
        </p>
      </div>
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0908] flex flex-col items-center justify-center p-4 relative overflow-hidden font-[Syne]">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(232,160,32,0.06)_0%,transparent_70%)]" />
        <div className="absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(91,143,212,0.04)_0%,transparent_70%)]" />
        <div className="absolute -bottom-20 -right-20 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(76,175,125,0.03)_0%,transparent_70%)]" />
        
        {/* Horizon Line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-linear-to-r from-transparent via-(--amber)/7 to-transparent" />
        
        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md relative flex justify-center py-20 z-10">
          <div className="w-12 h-12 border-4 border-(--amber)/30 border-t-(--amber) rounded-full animate-spin" />
        </div>
      }>
        <SignInContent />
      </Suspense>

      {/* Help Link */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 mt-6 font-mono text-[11px] text-(--muted) flex items-center gap-[6px]"
      >
        Need help? <a href="#" className="text-(--amber) font-medium hover:text-(--amber2) transition-colors">Contact Support</a>
      </motion.div>
    </div>
  );
}
