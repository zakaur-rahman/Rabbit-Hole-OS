'use client';

import React, { useEffect, useState } from 'react';
import { Lock, X, LogIn, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graph.store';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthGuardModal() {
    const router = useRouter();
    const { authModalState, setAuthModal } = useGraphStore();

    const handleSignIn = () => {
        setAuthModal(false);
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
                        className="fixed inset-0 z-100 bg-neutral-950/80 backdrop-blur-[2px]"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                        >
                            {/* Header Section */}
                            <div className="pt-8 px-6 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
                                    <Lock size={20} className="text-green-500" />
                                </div>

                                <h2 className="text-xl font-semibold text-white tracking-tight leading-tight mb-2">Secure Your Knowledge</h2>
                                <p className="text-neutral-500 text-[13px] leading-relaxed mb-6 px-2">
                                    {authModalState.message || "This feature requires an account to save your progress and access AI capabilities."}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="px-6 pb-8 space-y-3">
                                <button
                                    onClick={handleSignIn}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-neutral-950 rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
                                >
                                    <LogIn size={16} />
                                    Sign In to Continue
                                </button>

                                <button
                                    onClick={handleClose}
                                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium text-sm transition-colors border border-neutral-700"
                                >
                                    Not Now
                                </button>
                            </div>

                            {/* Trust Footer */}
                            <div className="py-3.5 px-6 bg-neutral-950/50 flex items-center justify-center gap-2 border-t border-neutral-800">
                                <ShieldCheck size={12} className="text-green-500/50" />
                                <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Your data, your control</span>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-3 right-3 p-1.5 text-neutral-600 hover:text-neutral-300 rounded-md transition-all"
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

