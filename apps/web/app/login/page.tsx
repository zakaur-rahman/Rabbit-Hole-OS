'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { generatePKCEData } from '@/lib/pkce';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { NodeCanvas } from '@/components/landing/NodeCanvas';
import { cn } from '@/lib/utils';

// Google OAuth Configuration
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/google';
const SCOPES = 'openid email profile';

function LoginContent() {
    const searchParams = useSearchParams();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parse desktop origin parameters
    const isDesktop = searchParams.get('source') === 'desktop';
    const deviceId = searchParams.get('device_id');
    const customRedirectUri = searchParams.get('redirect_uri');

    const hasAutoStarted = useRef(false);

    useEffect(() => {
        if (isDesktop && deviceId && customRedirectUri && !hasAutoStarted.current && !error) {
            hasAutoStarted.current = true;
            handleGoogleLogin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDesktop, deviceId, customRedirectUri, error]);

    const handleGoogleLogin = async () => {
        try {
            setIsRedirecting(true);
            setError(null);

            // 1. Generate PKCE values
            const { state, codeVerifier, codeChallenge } = await generatePKCEData();

            // 2. Store PKCE verifier keyed by state (so callback can retrieve it securely)
            localStorage.setItem(`pkce_verifier_${state}`, codeVerifier);

            // 3. If originated from Desktop App, store context in localStorage
            if (isDesktop && deviceId && customRedirectUri) {
                localStorage.setItem(`desktop_context_${state}`, JSON.stringify({
                    device_id: deviceId,
                    redirect_uri: customRedirectUri
                }));
            }

            // 4. Build Google OAuth Authorization URL
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.append('client_id', CLIENT_ID);
            authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('scope', SCOPES);
            authUrl.searchParams.append('state', state);
            authUrl.searchParams.append('access_type', 'offline');
            authUrl.searchParams.append('prompt', 'consent'); // Force consent to ensure we get refresh token
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');

            // 5. Redirect the user
            window.location.href = authUrl.toString();
        } catch (err) {
            console.error('Failed to initiate login:', err);
            setError('An error occurred while preparing to sign in. Please try again.');
            setIsRedirecting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[440px] relative z-10"
        >
            <div className="relative bg-white border border-rule/50 rounded-none p-10 shadow-[20px_20px_0_var(--faint)] z-10 overflow-hidden flex flex-col items-center">
                {/* Decorative Amber Accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-amber"></div>

                <div className="flex justify-center mb-10">
                    <Logo />
                </div>

                <h1 className="font-serif text-[clamp(24px,3vw,32px)] font-black text-ink mb-3 tracking-tight text-center leading-tight">
                    {isDesktop ? 'Cognode Desktop' : 'Welcome to Cognode'}
                </h1>

                <p className="text-mid text-[12px] text-center mb-12 px-6 font-mono leading-relaxed">
                    {isDesktop
                        ? 'Your session is waiting. Link this device to your primary research node.'
                        : 'Sign in to access your knowledge graph and synthesis engine.'}
                </p>

                {error && (
                    <div className="w-full bg-paper border-l-4 border-amber text-ink text-[11px] p-4 mb-8 font-mono">
                        <span className="font-bold text-amber mr-2 uppercase">Error:</span>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={isRedirecting}
                    className={cn(
                        "w-full group relative flex items-center justify-center gap-4 bg-ink text-paper font-mono text-[11px] tracking-[0.15em] uppercase py-4.5 px-8 transition-all hover:bg-amber hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed",
                        isRedirecting && "bg-mid"
                    )}
                >
                    {isRedirecting ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Redirecting...</span>
                        </div>
                    ) : (
                        <>
                            <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Continue with Google</span>
                        </>
                    )}
                </button>

                <div className="mt-12 text-[10px] text-mid tracking-widest font-mono text-center border-t border-rule/30 pt-8 w-full">
                    By linking your account, you agree to our <br/>
                    <a href="/terms" className="text-ink hover:text-amber transition-colors underline underline-offset-4 decoration-amber/30">Terms</a> and <a href="/privacy" className="text-ink hover:text-amber transition-colors underline underline-offset-4 decoration-amber/30">Privacy Policy</a>
                </div>
            </div>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-paper flex items-center justify-center p-6 relative overflow-hidden">
            <NodeCanvas />
            
            <Suspense fallback={
                <div className="w-full max-w-md relative flex flex-col items-center justify-center py-20 z-10 gap-6">
                    <Loader2 className="w-12 h-12 text-amber animate-spin" />
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-mid">Initializing Node...</p>
                </div>
            }>
                <LoginContent />
            </Suspense>
        </main>
    );
}
