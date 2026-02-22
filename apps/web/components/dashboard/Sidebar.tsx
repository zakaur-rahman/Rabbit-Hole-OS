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

export function Sidebar() {
    const pathname = usePathname();

    const handleLogout = () => {
        clearTokens();
        window.location.href = '/login';
    };

    return (
        <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col items-stretch pt-6 pb-4">
            {/* Branding */}
            <div className="px-6 mb-8">
                <Logo />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative
                ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
              `}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.name}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 bg-primary/10 rounded-xl"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="px-4 mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}
