'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { useUser } from '@/components/providers/UserContext';

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void } = {}) {
    const { user } = useUser();

    return (
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8">

            <div className="flex items-center gap-3">
                {/* Mobile hamburger */}
                <button
                    onClick={onMenuToggle}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5 md:hidden"
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Search mock */}
                <div className="hidden sm:flex items-center gap-2 text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-border w-64 lg:w-80 hover:bg-white/10 transition-colors cursor-text">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">Search dashboard...</span>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5" aria-label="Notifications">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                </button>

                <div className="h-6 w-px bg-border mx-1"></div>

                {/* User Avatar */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="text-right hidden sm:block">
                        {user ? (
                            <>
                                <p className="text-sm font-medium text-foreground leading-tight">
                                    {user.name || 'User'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {user.email}
                                </p>
                            </>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="w-24 h-3.5 bg-secondary rounded animate-pulse" />
                                <div className="w-32 h-3 bg-secondary/60 rounded animate-pulse" />
                            </div>
                        )}
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
