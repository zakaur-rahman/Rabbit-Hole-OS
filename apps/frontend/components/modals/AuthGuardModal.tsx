'use client';

import React, { useEffect, useState } from 'react';
import { Lock, X, LogIn, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graph.store';

export default function AuthGuardModal() {
    const router = useRouter();
    const { authModalState, setAuthModal } = useGraphStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (authModalState.isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [authModalState.isOpen]);

    if (!isVisible && !authModalState.isOpen) return null;

    const handleSignIn = () => {
        setAuthModal(false);
        router.push('/sign-in');
    };

    const handleClose = () => {
        setAuthModal(false);
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 transition-all duration-300 ${authModalState.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px]"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform ${authModalState.isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
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
            </div>
        </div>
    );
}

