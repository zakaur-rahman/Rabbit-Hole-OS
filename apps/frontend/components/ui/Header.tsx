'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, User, Rabbit, LayoutTemplate } from 'lucide-react';
import { CognodeLogo } from '../icons/cognode-logo';
import SettingsModal from '../modals/SettingsModal';
import LibraryModal from '../modals/LibraryModal';
interface HeaderProps {
    onSearch?: (query: string) => void;
    onToggleSidebar?: () => void;
}

export default function Header({ onSearch, onToggleSidebar }: HeaderProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showSettingsModal, setShowSettingsModal] = React.useState(false);
    const [showLibraryModal, setShowLibraryModal] = React.useState(false);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isMac, setIsMac] = React.useState(true);
    const router = useRouter();

    useEffect(() => {
        // Detect OS for shortcuts
        setIsMac(navigator.userAgent.toLowerCase().includes('mac'));
        // Check if user is authenticated by checking for token
        const checkAuth = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('auth_token');
                setIsAuthenticated(!!token);
            }
        };

        // Check on mount
        checkAuth();

        // Listen for storage changes (when login completes)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'auth_token') {
                checkAuth();
            }
        };

        // Listen for custom auth events (for same-tab updates)
        const handleAuthChange = () => {
            checkAuth();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth-state-changed', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-state-changed', handleAuthChange);
        };
    }, []);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(searchQuery);
        }
    };

    const handleSignInClick = () => {
        // In Electron, open the web login page in the system browser
        // instead of navigating to a local /sign-in page that can't render in file:// mode
        const electronApi = (window as any).electron;
        if (electronApi?.auth?.openLogin) {
            const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
            localStorage.setItem('device_id', deviceId);

            const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://cognode.tech';
            const loginUrl = `${webBaseUrl}/login?source=desktop&device_id=${deviceId}&redirect_uri=cognode://auth/callback`;

            // Open system browser for OAuth
            electronApi.auth.openLogin(loginUrl);

            // Listen for the deep link callback with the auth code
            if (electronApi.auth.onDeepLinkAuth) {
                electronApi.auth.onDeepLinkAuth(async ({ code }: { code: string }) => {
                    try {
                        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                        const response = await fetch(`${apiBaseUrl}/api/v1/oauth/desktop/exchange`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code }),
                        });

                        if (!response.ok) throw new Error('Exchange failed');

                        const data = await response.json();
                        localStorage.setItem('auth_token', data.access_token);
                        localStorage.setItem('refresh_token', data.refresh_token);
                        window.dispatchEvent(new Event('auth-state-changed'));
                        setIsAuthenticated(true);
                    } catch (err) {
                        console.error('[Auth] Desktop exchange failed:', err);
                    }
                });
            }
        } else {
            router.push('/sign-in');
        }
    };

    return (
        <>
            <header
                className="h-14 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 pr-[140px]"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                {/* Logo & Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-6 p-[2px] h-6 rounded-lg bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <CognodeLogo />
                    </div>
                    <span className="font-semibold text-white text-lg tracking-wider">Cognode</span>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl mx-8" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search knowledge..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-neutral-800 rounded">
                                {isMac ? '⌘K' : 'Ctrl+K'}
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <NavLink
                        label="Library"
                        onClick={() => setShowLibraryModal(true)}
                    />

                    <div className="w-px h-6 bg-neutral-800 mx-2" />

                    <button
                        onClick={() => alert("Notifications coming soon!")}
                        className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell size={18} />
                    </button>
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        aria-label="Settings"
                    >
                        <Settings size={18} />
                    </button>

                    {!isAuthenticated && (
                        <button
                            onClick={handleSignInClick}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <User size={16} />
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Settings Modal */}
            <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

            {/* Library Modal */}
            <LibraryModal isOpen={showLibraryModal} onClose={() => setShowLibraryModal(false)} />
        </>
    );
}

function NavLink({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${active
                ? 'text-green-400 bg-green-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
        >
            {label}
        </button>
    );
}
