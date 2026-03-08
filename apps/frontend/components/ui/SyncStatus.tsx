'use client';

import { useEffect, useState } from 'react';
import { CloudOff, Check, Loader2, WifiOff } from 'lucide-react';

type SyncStatus = 'saved' | 'syncing' | 'offline' | 'error';

export function SyncStatus() {
    const [status, setStatus] = useState<SyncStatus>('saved');
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        // Check if running in Electron
        if (typeof window === 'undefined' || !window.electron) {
            setTimeout(() => setLastSync(new Date()), 0);
            return;
        }

        // Listen for sync events from Electron main process


        const handleOffline = () => {
            setStatus('offline');
        };

        const handleOnline = () => {
            if (status === 'offline') {
                setStatus('saved');
            }
        };

        // Set up event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Clean up
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [status]);

    // Check initial online status (separate effect to avoid setState-in-effect lint)
    useEffect(() => {
        if (!navigator.onLine) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus('offline');
        }
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
            case 'error':
                return 'Sync failed - will retry';
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

    const getIcon = () => {
        switch (status) {
            case 'syncing':
                return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
            case 'offline':
                return <WifiOff className="w-3 h-3 text-neutral-500" />;
            case 'error':
                return <CloudOff className="w-3 h-3 text-orange-400" />;
            case 'saved':
                return <Check className="w-3 h-3 text-green-400" />;
            default:
                return <Check className="w-3 h-3 text-green-400" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'syncing':
                return 'border-blue-500/20 bg-blue-500/5';
            case 'offline':
                return 'border-neutral-700 bg-neutral-800/50';
            case 'error':
                return 'border-orange-500/20 bg-orange-500/5';
            case 'saved':
                return 'border-green-500/20 bg-green-500/5';
            default:
                return 'border-neutral-800 bg-neutral-900/90';
        }
    };

    return (
        <div
            className={`fixed bottom-4 right-4 px-3 py-2 border rounded-lg flex items-center gap-2 text-xs backdrop-blur-sm transition-all duration-300 ${getStatusColor()}`}
            title={getStatusText()}
        >
            {getIcon()}
            <span className="text-neutral-300 font-medium">{getStatusText()}</span>
        </div>
    );
}
