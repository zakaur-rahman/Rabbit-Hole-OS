'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { NodeCanvas } from '@/components/landing/NodeCanvas';

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
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px] relative z-10"
        >
            <div className="relative bg-white border border-rule/50 rounded-none p-12 shadow-[20px_20px_0_var(--faint)] z-10 overflow-hidden flex flex-col items-center min-h-[400px] justify-center text-center">
                {/* Decorative Amber Accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-amber"></div>

                {desktopSuccess ? (
                    <div className="flex flex-col items-center gap-6">
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-20 h-20 bg-paper rounded-full flex items-center justify-center border border-rule/30"
                        >
                            <CheckCircle2 className="w-10 h-10 text-amber" strokeWidth={1.5} />
                        </motion.div>
                        
                        <div className="space-y-3">
                            <h2 className="font-serif text-2xl font-black text-ink">Success</h2>
                            <p className="text-mid text-[12px] font-mono leading-relaxed max-w-[280px]">
                                Your node is now linked. You can close this tab and return to the Cognode app.
                            </p>
                        </div>

                        <button
                            onClick={() => window.close()}
                            className="mt-6 px-8 py-3.5 bg-ink text-paper font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-amber hover:text-ink transition-all"
                        >
                            Securely End Session
                        </button>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-6">
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-20 h-20 bg-paper rounded-full flex items-center justify-center border border-rule/30"
                        >
                            <XCircle className="w-10 h-10 text-mid" strokeWidth={1.5} />
                        </motion.div>

                        <div className="space-y-3">
                            <h1 className="font-serif text-2xl font-black text-ink">Authentication Failed</h1>
                            <p className="text-mid text-[12px] font-mono leading-relaxed px-4">{error}</p>
                        </div>
                        
                        <button
                            onClick={() => router.push('/login')}
                            className="mt-6 w-full px-8 py-3.5 bg-ink text-paper font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-amber hover:text-ink transition-all"
                        >
                            Return to Entry
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <div className="absolute inset-0 border-[1px] border-rule/20 rounded-full scale-110"></div>
                            <div className="absolute inset-0 border-t-[1px] border-amber rounded-full animate-spin"></div>
                            <Logo className="opacity-40 grayscale group-hover:grayscale-0" />
                        </div>
                        
                        <div className="space-y-3">
                            <h1 className="font-serif text-2xl font-black text-ink tracking-tight">Verifying Node Identity</h1>
                            <p className="text-mid text-[11px] font-mono tracking-wide">
                                SECURELY ENCRYPTING SESSION &<br/>
                                EXCHANGING SYNTHESIS KEYS...
                            </p>
                        </div>
                        
                        <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <motion.div 
                                    key={i}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1.5 h-1.5 bg-amber rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function AuthGoogleCallbackPage() {
    return (
        <main className="min-h-screen bg-paper flex items-center justify-center p-6 relative overflow-hidden">
            <NodeCanvas />
            
            <Suspense fallback={
                <div className="w-full max-w-md relative flex flex-col items-center justify-center py-20 z-10 gap-6">
                    <Loader2 className="w-12 h-12 text-amber animate-spin" />
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-mid">Negotiating Protocol...</p>
                </div>
            }>
                <GoogleCallbackContent />
            </Suspense>
        </main>
    );
}
