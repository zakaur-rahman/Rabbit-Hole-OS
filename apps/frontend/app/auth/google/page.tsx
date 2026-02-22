'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPKCEVerifier } from '@/lib/auth/pkce';
import { AUTH_CONFIG, getRedirectUri } from '@/lib/auth/config';
import { getDeviceInfo } from '@/lib/auth/device';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, MonitorSmartphone, XCircle, ArrowRight } from 'lucide-react';

function GoogleAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'desktop-ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Securely verifying your identity...');
  const [desktopCode, setDesktopCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [deepLinkOpened, setDeepLinkOpened] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        const codeVerifier = getPKCEVerifier(state);
        if (!codeVerifier) {
          throw new Error('PKCE verifier not found. Please try signing in again.');
        }

        const desktopContextRaw = localStorage.getItem(`desktop_context_${state}`);
        const desktopContext = desktopContextRaw ? JSON.parse(desktopContextRaw) : null;

        const exchangeUrl = `${AUTH_CONFIG.API_BASE_URL}/api/v1/oauth/google/exchange`;
        const response = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            state,
            redirect_uri: getRedirectUri(),
            ...getDeviceInfo(),
            ...(desktopContext ? {
              desktop_device_id: desktopContext.device_id,
              desktop_redirect_uri: `${desktopContext.redirect_protocol}://auth/callback`,
            } : {}),
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          let errData;
          try { errData = JSON.parse(errText); } catch { errData = { detail: errText || `HTTP ${response.status}` }; }
          throw new Error(errData.detail || `Token exchange failed (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (desktopContext) {
          localStorage.removeItem(`desktop_context_${state}`);
        }

        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        window.dispatchEvent(new Event('auth-state-changed'));

        if (data.desktop_auth_code && desktopContext) {
          setDesktopCode(data.desktop_auth_code);
          setUserName(data.user?.name || data.user?.email || 'User');
          setStatus('desktop-ready');
          setMessage('You can now return to the desktop app.');
          return;
        }

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        setTimeout(() => router.push('/'), 1200);
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleOpenInApp = () => {
    if (!desktopCode) return;
    const deepLink = `${AUTH_CONFIG.DESKTOP_PROTOCOL}://auth/callback?code=${encodeURIComponent(desktopCode)}`;
    setDeepLinkOpened(true);
    window.location.href = deepLink;
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      className="w-full max-w-md relative z-10"
    >
      {/* Ambient Glow */}
      <div className="absolute -inset-0.5 bg-linear-to-br from-green-500/30 to-emerald-700/30 rounded-[32px] blur-2xl opacity-50 z-0"></div>

      <div className="relative bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden text-center min-h-[360px] flex flex-col items-center justify-center">

        {/* Subtle top inner gradient */}
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

        <AnimatePresence mode="wait">
          {/* Loading */}
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-green-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <Loader2 className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Authenticating</h2>
              <p className="text-neutral-400 text-sm max-w-[260px]">{message}</p>
            </motion.div>
          )}

          {/* Desktop Ready — "Open in App" */}
          {status === 'desktop-ready' && (
            <motion.div
              key="desktop-ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center w-full"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 text-white"
              >
                <Check className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Access Granted</h2>
              <p className="text-neutral-400 text-sm mb-8">Welcome back, <span className="text-white font-medium">{userName}</span></p>

              <button
                onClick={handleOpenInApp}
                className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold rounded-2xl transition-all"
              >
                <MonitorSmartphone className="w-5 h-5 text-neutral-700" />
                <span>Open in Cognode App</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </button>

              <AnimatePresence>
                {deepLinkOpened && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 text-xs text-neutral-500"
                  >
                    Didn&apos;t work?{' '}
                    <button onClick={handleOpenInApp} className="text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors">
                      Try again
                    </button>
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-8 pt-6 border-t border-white/5 w-full">
                <p className="text-xs text-neutral-500">
                  Or{' '}
                  <button
                    onClick={() => router.push('/')}
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    continue in browser
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* Web-only success */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-20 h-20 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 text-white"
              >
                <Check className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Success!</h2>
              <p className="text-neutral-400 text-sm max-w-[260px]">{message}</p>
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-linear-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/30 text-white"
              >
                <XCircle className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Authentication Failed</h2>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed max-w-[280px]">{message}</p>

              <button
                onClick={() => router.push('/sign-in')}
                className="px-8 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold rounded-xl transition-all"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function GoogleAuthCallbackPage() {
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
        <GoogleAuthCallbackContent />
      </Suspense>
    </div>
  );
}
