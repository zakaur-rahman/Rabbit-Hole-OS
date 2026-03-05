'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorSmartphone, X, ExternalLink, Loader2 } from 'lucide-react';

interface DesktopBannerProps {
    desktopAuthCode: string;
}

export function DesktopBanner({ desktopAuthCode }: DesktopBannerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState<'idle' | 'launching' | 'failed'>('idle');

    useEffect(() => {
        // Only show if it hasn't been dismissed in this session
        const dismissed = localStorage.getItem('desktop_banner_dismissed');
        if (!dismissed) {
            const timeout = setTimeout(() => {
                setIsVisible(true);
            }, 0);
            return () => clearTimeout(timeout);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('desktop_banner_dismissed', 'true');
    };

    const handleOpenApp = () => {
        setStatus('launching');

        // Trigger the deep link
        window.location.href = `cognode://auth/callback?code=${encodeURIComponent(desktopAuthCode)}`;

        // Fallback detection if deep link fails (visibility keeps checking if they are still on this page)
        const timeout = setTimeout(() => {
            // If the page is still visible after 3 seconds, the deep link likely failed
            if (document.hidden === false) {
                setStatus('failed');
            }
        }, 3000);

        return () => clearTimeout(timeout);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-primary/10 border-b border-primary/20 overflow-hidden relative z-40"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                                <MonitorSmartphone className="w-5 h-5 text-primary" />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                {status === 'idle' && (
                                    <>
                                        <p className="text-sm font-medium text-foreground">
                                            You signed in from the desktop app.
                                        </p>
                                        <button
                                            onClick={handleOpenApp}
                                            className="text-sm text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors"
                                        >
                                            Open Desktop App <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </>
                                )}

                                {status === 'launching' && (
                                    <>
                                        <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            Launching Cognode…
                                        </p>
                                        <span className="text-sm text-muted-foreground">You can close this tab or stay here.</span>
                                    </>
                                )}

                                {status === 'failed' && (
                                    <>
                                        <p className="text-sm font-medium text-destructive">
                                            Desktop app not detected.
                                        </p>
                                        <a
                                            href="/download"
                                            className="text-sm text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors underline underline-offset-2"
                                        >
                                            Download Cognode
                                        </a>
                                        <button
                                            onClick={handleOpenApp}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-2"
                                        >
                                            Try again
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors shrink-0"
                            aria-label="Dismiss banner"
                        >
                            <X className="w-5 h-5" />
                        </button>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
