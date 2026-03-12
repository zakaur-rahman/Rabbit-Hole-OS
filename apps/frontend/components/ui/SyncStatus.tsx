'use client';

import { useEffect, useState } from 'react';

type SyncStatus = 'saved' | 'syncing' | 'offline' | 'error' | 'unauthenticated';

export function SyncStatus() {
    const [status, setStatus] = useState<SyncStatus>('saved');
    const [lastSync, setLastSync] = useState<Date | null>(null);

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

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
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
                if (lastSync) {
                    const secondsAgo = Math.floor((now - lastSync.getTime()) / 1000);
                    if (secondsAgo < 10) return 'All changes saved';
                    const minutesAgo = Math.floor(secondsAgo / 60);
                    if (minutesAgo === 0) return 'Synced just now';
                    if (minutesAgo === 1) return 'Synced 1 min ago';
                    if (minutesAgo < 60) return `Synced ${minutesAgo} mins ago`;
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    return `Synced ${hoursAgo}h ago`;
                }
                return 'All changes saved locally';
            default:
                return 'All changes saved locally';
        }
    };

    const getDotColor = (): string => {
        switch (status) {
            case 'syncing':
                return 'bg-[var(--blue)]';
            case 'offline':
                return 'bg-[var(--muted)]';
            case 'unauthenticated':
                return 'bg-[var(--amber)]';
            case 'error':
                return 'bg-[var(--red)]';
            case 'saved':
                return 'bg-[var(--green)]';
            default:
                return 'bg-[var(--green)]';
        }
    };

    return (
        <div
            className="fixed bottom-6 left-6 px-4 py-[7px] bg-[#161412]/80 border border-[#2a2622] rounded-full flex items-center gap-[8px] backdrop-blur-xl transition-all duration-300 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-[#3a3530]"
            title={getStatusText()}
        >
            <div className={`w-[6px] h-[6px] rounded-full ${getDotColor()} ${status === 'syncing' ? 'animate-pulse' : ''} shadow-[0_0_8px_currentColor]`} />
            <span className="text-[#ede7dc]/60 font-mono text-[9px] font-bold tracking-widest uppercase">{getStatusText()}</span>
        </div>
    );
}
