'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google';

function GoogleCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [desktopSuccess, setDesktopSuccess] = useState(false);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const oauthError = searchParams.get('error');

                if (oauthError) throw new Error(`Google returned an error: ${oauthError}`);
                if (!code || !state) throw new Error('Invalid callback URL parameters');

                // Retrieve PKCE verifier and Desktop Context from storage
                const codeVerifier = localStorage.getItem(`pkce_verifier_${state}`);
                if (!codeVerifier) {
                    throw new Error('Authentication session expired or invalid. Please try logging in again.');
                }

                const desktopContextRaw = localStorage.getItem(`desktop_context_${state}`);
                const desktopContext = desktopContextRaw ? JSON.parse(desktopContextRaw) : null;

                // Exchange code for tokens
                const exchangePayload: Record<string, string> = {
                    code,
                    code_verifier: codeVerifier,
                    state,
                    redirect_uri: REDIRECT_URI,
                    user_agent: navigator.userAgent
                };

                // If desktop flow, attach required triggers
                if (desktopContext) {
                    exchangePayload.device_id = desktopContext.device_id;       // for session record
                    exchangePayload.desktop_device_id = desktopContext.device_id; // for Redis one-time code
                    exchangePayload.desktop_redirect_uri = desktopContext.redirect_uri;
                    exchangePayload.device_name = 'Cognode Desktop';
                    exchangePayload.platform = navigator.platform || 'Desktop';
                }

                const res = await fetch(`${API_BASE_URL}/oauth/google/exchange`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exchangePayload)
                });

                if (!res.ok) {
                    const detail = await res.text();
                    throw new Error(`Token exchange failed. The server said: ${detail}`);
                }

                const data = await res.json();

                // 1. Save standard Web tokens
                setTokens(data.access_token, data.refresh_token);

                // 2. Clean up transient auth state
                localStorage.removeItem(`pkce_verifier_${state}`);
                localStorage.removeItem(`desktop_context_${state}`);

                // 3. Desktop Handoff Logic
                if (desktopContext?.redirect_uri?.startsWith('cognode://')) {
                    let desktopRedirectUrl: string;

                    if (data.desktop_auth_code) {
                        // Standard path: backend generated a one-time code via Redis
                        desktopRedirectUrl = `${desktopContext.redirect_uri}?code=${encodeURIComponent(data.desktop_auth_code)}`;
                    } else {
                        // Fallback: Redis unavailable (free tier) — pass tokens directly in the deep link
                        // The desktop app receives these via the cognode:// protocol handler
                        console.warn('[Auth] No desktop_auth_code from backend (Redis may be unavailable), falling back to direct token handoff');
                        desktopRedirectUrl = `${desktopContext.redirect_uri}?access_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token || '')}`;
                    }

                    console.log('[Auth] Redirecting to desktop app via deep link');
                    window.location.href = desktopRedirectUrl;
                    setDesktopSuccess(true); // Show success screen — browser stays on page after custom protocol redirect
                    return; // Don't navigate to dashboard
                }

                // Navigate to the Dashboard (web-only flow)
                router.replace('/dashboard');

            } catch (err: unknown) {
                console.error('Callback error:', err);
                setError(err instanceof Error ? err.message : 'An unexpected error occurred during authentication.');
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md relative z-10"
        >
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/30 to-emerald-700/30 rounded-[32px] blur-2xl opacity-50 z-0"></div>

            <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden flex flex-col items-center min-h-[300px] justify-center text-center">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

                {desktopSuccess ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <Logo className="w-10 h-10" />
                        <h2 className="text-xl font-semibold text-foreground">Signed in successfully!</h2>
                        <p className="text-sm text-muted-foreground">You can close this tab and return to Cognode.</p>
                        <button
                            onClick={() => window.close()}
                            className="mt-2 px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors"
                        >
                            Close Tab
                        </button>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-foreground mb-2">Authentication Failed</h1>
                        <p className="text-muted-foreground text-sm mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="bg-foreground text-background font-medium py-3 px-6 rounded-2xl w-full hover:bg-neutral-200 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <Logo className="w-8 h-8 opacity-50 animate-pulse" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground mb-2">Verifying Identity</h1>
                        <p className="text-muted-foreground text-sm">Securely encrypting your session and exchanging keys...</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function AuthGoogleCallbackPage() {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-background flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px]" />
            </div>

            <Suspense fallback={
                <div className="w-full max-w-md relative flex justify-center py-20 z-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            }>
                <GoogleCallbackContent />
            </Suspense>
        </div>
    );
}
