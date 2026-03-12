'use client';

import React from 'react';
import { Lock, X, LogIn, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graph.store';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthGuardModal() {
    const router = useRouter();
    const { authModalState, setAuthModal } = useGraphStore();

    const handleSignIn = () => {
        setAuthModal(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronApi = (window as any).electron;
        if (electronApi?.auth?.openLogin) {
            const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
            localStorage.setItem('device_id', deviceId);
            const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://cognode.tech';
            const loginUrl = `${webBaseUrl}/login?source=desktop&device_id=${deviceId}&redirect_uri=cognode://auth/callback`;
            electronApi.auth.openLogin(loginUrl);
            if (electronApi.auth.onDirectTokensReceived) {
                electronApi.auth.onDirectTokensReceived(({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
                    localStorage.setItem('auth_token', access_token);
                    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
                    window.dispatchEvent(new Event('auth-state-changed'));
                });
            }
            if (electronApi.auth.onDeepLinkAuth) {
                electronApi.auth.onDeepLinkAuth(async ({ code }: { code: string }) => {
                    try {
                        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.cognode.tech';
                        const res = await fetch(`${apiBaseUrl}/api/v1/oauth/desktop/exchange`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code }),
                        });
                        if (!res.ok) throw new Error('Exchange failed');
                        const data = await res.json();
                        localStorage.setItem('auth_token', data.access_token);
                        localStorage.setItem('refresh_token', data.refresh_token);
                        window.dispatchEvent(new Event('auth-state-changed'));
                    } catch (err) { console.error('[Auth] Desktop exchange failed:', err); }
                });
            }
        } else {
            router.push('/sign-in');
        }
    };

    const handleClose = () => {
        setAuthModal(false);
    };

    return (
        <AnimatePresence>
            {authModalState.isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 bg-black/60 backdrop-blur-[2px]"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[360px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col items-center pt-8 pb-4"
                        >
                            {/* Header Section */}
                            <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-[rgba(76,175,125,0.05)] border border-[var(--green)] mb-5">
                                <Lock size={20} className="text-[var(--green)]" strokeWidth={1.5} />
                            </div>

                            <h2 className="text-[20px] font-bold text-[#f0f0f0] tracking-tight mb-2">Secure Your Knowledge</h2>
                            <p className="text-[#888] text-[13px] font-medium leading-relaxed text-center px-8 mb-8">
                                {authModalState.message || "Auto-sync requires an account to save your browsing path and sync it across devices."}
                            </p>

                            {/* Actions */}
                            <div className="w-full px-6 flex flex-col gap-3">
                                <button
                                    onClick={handleSignIn}
                                    className="w-full flex items-center justify-center gap-2 h-11 bg-[var(--green)] hover:brightness-110 text-[#111] rounded-[6px] font-bold text-[14px] transition-all active:scale-[0.98]"
                                >
                                    <LogIn size={18} strokeWidth={2} />
                                    Sign In to Continue
                                </button>

                                <button
                                    onClick={handleClose}
                                    className="w-full h-11 bg-[var(--raised)] border border-[var(--border2)] hover:bg-[var(--border)] text-[#f0f0f0] rounded-[6px] font-bold text-[14px] transition-colors"
                                >
                                    Not Now
                                </button>
                            </div>

                            {/* Trust Footer */}
                            <div className="w-full mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-center gap-2">
                                <ShieldCheck size={14} className="text-[var(--green)] opacity-70" />
                                <span className="text-[10px] text-[#666] uppercase tracking-[0.1em] font-bold">Your data, your control</span>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-3 right-3 p-1.5 text-[var(--sub)] hover:text-[var(--text)] hover:bg-[var(--raised)] rounded-[var(--r)] transition-all"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

