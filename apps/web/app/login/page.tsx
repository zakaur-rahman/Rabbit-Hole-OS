'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { generatePKCEData } from '@/lib/pkce';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md relative z-10"
        >
            {/* Ambient Glow */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/30 to-emerald-700/30 rounded-[32px] blur-2xl opacity-50 z-0"></div>

            <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden flex flex-col items-center">
                {/* Subtle top inner gradient */}
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

                <div className="flex justify-center mb-6 pt-4">
                    <Logo />
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight text-center">
                    {isDesktop ? 'Cognode Desktop Login' : 'Welcome to Cognode'}
                </h1>

                <p className="text-muted-foreground text-sm text-center mb-8 px-4">
                    {isDesktop
                        ? 'Access your structured knowledge straight from the desktop app.'
                        : 'Sign in to access your knowledge graph and research synthesis tools.'}
                </p>

                {error && (
                    <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={isRedirecting}
                    className="w-full relative group flex items-center justify-center gap-3 bg-foreground hover:bg-neutral-200 text-background font-medium py-3.5 px-6 rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                >
                    {isRedirecting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            {/* Google G Logo SVG */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Continue with Google</span>
                        </>
                    )}
                </button>

                <div className="mt-8 text-xs text-muted-foreground text-center">
                    By signing in, you agree to our <a href="#" className="hover:text-primary transition-colors underline underline-offset-2">Terms</a> and <a href="#" className="hover:text-primary transition-colors underline underline-offset-2">Privacy Policy</a>
                </div>
            </div>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Abstract Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px]" />
            </div>

            <Suspense fallback={
                <div className="w-full max-w-md relative flex justify-center py-20 z-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            }>
                <LoginContent />
            </Suspense>
        </div>
    );
}
