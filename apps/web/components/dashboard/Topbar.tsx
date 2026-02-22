'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Bell, Search } from 'lucide-react';

interface UserProfile {
    name?: string;
    email: string;
    avatar_url?: string;
}

export function Topbar() {
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        async function loadUser() {
            try {
                const res = await apiFetch('/oauth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (error) {
                console.error('Failed to load user profile in Topbar', error);
            }
        }
        loadUser();
    }, []);

    return (
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">

            {/* Search mock */}
            <div className="flex items-center gap-2 text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-border w-1/3 hover:bg-white/10 transition-colors cursor-text">
                <Search className="w-4 h-4" />
                <span className="text-sm">Search dashboard...</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                </button>

                <div className="h-6 w-px bg-border mx-1"></div>

                {/* User Avatar */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground leading-tight">
                            {user?.name || 'Loading...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {user?.email || ''}
                        </p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden border border-border shrink-0 flex items-center justify-center text-secondary-foreground font-semibold">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            // Fallback initial
                            user?.name ? user.name.charAt(0).toUpperCase() : '?'
                        )}
                    </div>
                </div>
            </div>

        </header>
    );
}
