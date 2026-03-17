'use client';

import { Bell, Search, Menu, Command } from 'lucide-react';
import { useUser } from '@/components/providers/UserContext';
import { motion } from 'framer-motion';

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void } = {}) {
    const { user } = useUser();

    return (
        <header className="h-16 border-b border-dashboard-border bg-dashboard-bg/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10">

            <div className="flex items-center gap-6 flex-1">
                {/* Mobile hamburger */}
                <button
                    onClick={onMenuToggle}
                    className="p-2 text-neutral-400 hover:text-white transition-all rounded-lg hover:bg-white/5 md:hidden"
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Raycast-style Search Bar */}
                <div className="hidden sm:flex items-center gap-3 text-neutral-500 bg-white/5 px-4 py-2 rounded-xl border border-white/5 w-full max-w-sm lg:max-w-md group hover:bg-white/10 hover:border-white/10 transition-all cursor-text relative">
                    <Search className="w-4 h-4 group-hover:text-neutral-300 transition-colors" />
                    <span className="text-[13px] font-mono tracking-tight flex-1">Search nodes or commands...</span>
                    
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono leading-none flex items-center gap-0.5">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-5">
                <button className="relative p-2 text-neutral-400 hover:text-white transition-all rounded-full hover:bg-white/5 group" aria-label="Notifications">
                    <Bell className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-amber rounded-full shadow-[0_0_8px_rgba(200,134,10,0.6)]"></span>
                </button>

                <div className="h-4 w-px bg-white/5 mx-1 hidden sm:block"></div>

                {/* User Profile */}
                <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3.5 pl-2 group cursor-pointer"
                >
                    <div className="text-right hidden lg:block">
                        {user ? (
                            <div className="flex flex-col">
                                <span className="text-[13px] font-mono font-medium text-neutral-200 leading-tight group-hover:text-white transition-colors">
                                    {user.name || 'Anonymous Node'}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-400 transition-colors uppercase tracking-widest">
                                    Pro Tier
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
                                <div className="w-16 h-2 bg-white/5 rounded animate-pulse" />
                            </div>
                        )}
                    </div>
                    
                    <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-neutral-900 overflow-hidden border border-white/10 group-hover:border-amber/50 transition-all shrink-0 flex items-center justify-center text-neutral-400 shadow-inner">
                            {user?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <span className="text-[12px] font-mono font-bold">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                                </span>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dashboard-bg shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                    </div>
                </motion.div>
            </div>

        </header>
    );
}
