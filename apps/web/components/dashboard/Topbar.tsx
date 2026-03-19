'use client';

import { Bell, Search, Menu, Command } from 'lucide-react';
import { useUser } from '@/components/providers/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void } = {}) {
    const { user } = useUser();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    return (
        <header className="h-16 border-b border-ink/10 bg-paper/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10">

            <div className="flex items-center gap-6 flex-1">
                {/* Mobile hamburger */}
                <button
                    onClick={onMenuToggle}
                    className="p-2 text-neutral-400 hover:text-ink transition-all rounded-lg hover:bg-ink/5 md:hidden"
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Raycast-style Search Bar */}
                <div className={`hidden sm:flex items-center gap-3 bg-ink/5 px-4 py-2 rounded-xl border w-full max-w-sm lg:max-w-md group transition-all relative
                    ${isSearchActive ? 'bg-ink/10 border-ink/20 ring-2 ring-amber/20' : 'border-ink/5 hover:bg-ink/10 hover:border-ink/10'}
                `}>
                    <Search className={`w-4 h-4 transition-colors ${isSearchActive ? 'text-amber' : 'text-neutral-500 group-hover:text-ink/80'}`} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchActive(true)}
                        onBlur={() => setIsSearchActive(false)}
                        placeholder="Search nodes or commands..."
                        className="bg-transparent border-none outline-none text-[13px] font-mono tracking-tight flex-1 text-ink placeholder:text-neutral-500"
                    />
                    
                    <div className={`flex items-center gap-1 transition-opacity ${isSearchActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
                        <kbd className="px-1.5 py-0.5 rounded border border-ink/10 bg-ink/5 text-[10px] font-mono leading-none flex items-center gap-0.5">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-5">
                <div className="relative">
                    <button 
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className={`relative p-2 transition-all rounded-full group focus:outline-none
                            ${isNotificationOpen ? 'text-ink bg-ink/10' : 'text-neutral-400 hover:text-ink hover:bg-ink/5'}
                        `}
                        aria-label="Notifications"
                    >
                        <Bell className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-amber rounded-full shadow-[0_0_8px_rgba(200,134,10,0.6)] border border-paper z-10"></span>
                    </button>

                    <AnimatePresence>
                        {isNotificationOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full right-0 mt-2 w-80 bg-paper border border-ink/10 rounded-2xl shadow-xl shadow-ink/5 z-50 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-ink/5 flex items-center justify-between bg-ink/2">
                                        <h3 className="text-[11px] font-mono font-bold text-ink uppercase tracking-widest">Notifications</h3>
                                        <span className="text-[9px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-full border border-amber/20">2 New</span>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                        <div className="p-4 border-b border-ink/5 hover:bg-ink/2 transition-colors cursor-pointer group/notif">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 mt-1.5 rounded-full bg-amber shrink-0 shadow-[0_0_8px_rgba(200,134,10,0.4)]" />
                                                <div>
                                                    <p className="text-[13px] font-serif font-black text-ink mb-1 group-hover/notif:text-amber transition-colors">Synchronization Complete</p>
                                                    <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">Node &quot;Graph-Alpha&quot; successfully synced across all protocols.</p>
                                                    <p className="text-[9px] font-mono text-neutral-400 mt-2 uppercase tracking-widest">2 mins ago</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 border-b border-ink/5 hover:bg-ink/2 transition-colors cursor-pointer group/notif">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 mt-1.5 rounded-full bg-amber shrink-0 shadow-[0_0_8px_rgba(200,134,10,0.4)]" />
                                                <div>
                                                    <p className="text-[13px] font-serif font-black text-ink mb-1 group-hover/notif:text-amber transition-colors">Security Alert</p>
                                                    <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">New cross-origin request detected from unknown IP.</p>
                                                    <p className="text-[9px] font-mono text-neutral-400 mt-2 uppercase tracking-widest">1 hour ago</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 text-center border-t border-ink/5 bg-ink/2">
                                        <button 
                                            onClick={() => setIsNotificationOpen(false)}
                                            className="text-[10px] font-mono text-neutral-500 hover:text-ink transition-colors uppercase tracking-widest py-1"
                                        >
                                            Dismiss All
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-4 w-px bg-ink/10 mx-1 hidden sm:block"></div>

                {/* User Profile */}
                <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3.5 pl-2 group cursor-pointer"
                >
                    <div className="text-right hidden lg:block">
                        {user ? (
                            <div className="flex flex-col">
                                <span className="text-[13px] font-mono font-medium text-ink/80 leading-tight group-hover:text-ink transition-colors">
                                    {user.name || 'Anonymous Node'}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-400 transition-colors uppercase tracking-widest">
                                    Pro Tier
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="w-24 h-3 bg-ink/5 rounded animate-pulse" />
                                <div className="w-16 h-2 bg-ink/5 rounded animate-pulse" />
                            </div>
                        )}
                    </div>
                    
                    <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-ink/5 overflow-hidden border border-ink/10 group-hover:border-amber/50 transition-all shrink-0 flex items-center justify-center text-neutral-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                            {user?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <span className="text-[12px] font-mono font-bold">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                                </span>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-paper shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                    </div>
                </motion.div>
            </div>

        </header>
    );
}
