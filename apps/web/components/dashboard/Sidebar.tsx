'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import {
    BarChart3,
    CreditCard,
    FolderSync,
    LayoutDashboard,
    LogOut
} from 'lucide-react';
import { clearTokens } from '@/lib/auth';

const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderSync },
    { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
    const pathname = usePathname();

    const handleLogout = () => {
        clearTokens();
        window.location.href = '/login';
    };

    return (
        <aside className="w-68 border-r border-dashboard-border bg-dashboard-sidebar backdrop-blur-3xl h-screen sticky top-0 flex flex-col items-stretch pt-8 pb-6 z-50">
            {/* Branding */}
            <div className="px-7 mb-10 group">
                <Logo variant="dark" />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={`
                                flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[13px] font-mono tracking-tight transition-all relative group
                                ${isActive ? 'text-white' : 'text-neutral-450 hover:text-neutral-200 hover:bg-white/5'}
                            `}
                        >
                            <item.icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'text-amber' : 'text-neutral-500 group-hover:scale-110'}`} />
                            <span className="relative z-10">{item.name}</span>
                            
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 bg-white/5 border border-white/5 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.02)]"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="px-3 mt-auto pt-6 border-t border-dashboard-border/50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[13px] font-mono tracking-tight text-neutral-500 border border-white/5 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                >
                    <LogOut className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                    <span>End Session</span>
                </button>
            </div>
        </aside>
    );
}
