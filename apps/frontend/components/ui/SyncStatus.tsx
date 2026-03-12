'use client';

import { useEffect, useState } from 'react';

type SyncStatus = 'saved' | 'syncing' | 'offline' | 'error' | 'unauthenticated';

export function SyncStatus() {
    const [status, setStatus] = useState<SyncStatus>('saved');

    useEffect(() => {
        // Initial auth check
        const checkAuth = () => {
            if (typeof window !== 'undefined') {
                const hasToken = !!localStorage.getItem('auth_token');
                if (!hasToken && !window.electron) {
                    setStatus('unauthenticated');
                } else if (navigator.onLine) {
                    setStatus('saved');
                } else {
                    setStatus('offline');
                }
            }
        };

        checkAuth();

        const handleOffline = () => setStatus('offline');
        const handleOnline = () => {
            const hasToken = !!localStorage.getItem('auth_token');
            setStatus(hasToken || window.electron ? 'saved' : 'unauthenticated');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token') checkAuth();
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);



    const getStatusText = (): string => {
        switch (status) {
            case 'syncing':
                return 'Syncing...';
            case 'offline':
                return 'Working offline';
            case 'unauthenticated':
                return 'Local Only (Sign in to sync)';
            case 'error':
                return 'Sync failed — will retry';
            case 'saved':
                return 'All changes saved locally';
            default:
                return 'All changes saved locally';
        }
    };

    const getDotColor = (): string => {
        switch (status) {
            case 'syncing':
                return 'bg-(--blue)';
            case 'offline':
                return 'bg-(--muted)';
            case 'unauthenticated':
                return 'bg-(--amber)';
            case 'error':
                return 'bg-(--red)';
            case 'saved':
                return 'bg-(--green)';
            default:
                return 'bg-(--green)';
        }
    };

    return (
        <div
            className="absolute bottom-6 left-6 px-4 py-[7px] bg-[#161412]/80 border border-[#2a2622] rounded-full flex items-center gap-[8px] backdrop-blur-xl transition-all duration-300 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-[#3a3530]"
            title={getStatusText()}
        >
            <div className={`w-[6px] h-[6px] rounded-full ${getDotColor()} ${status === 'syncing' ? 'animate-pulse' : ''} shadow-[0_0_8px_currentColor]`} />
            <span className="text-[#ede7dc]/60 font-mono text-[9px] font-bold tracking-widest uppercase">{getStatusText()}</span>
        </div>
    );
}
