'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, Database, Sparkles, FolderSync } from 'lucide-react';
import { useUser } from '@/components/providers/UserContext';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

export default function DashboardOverview() {
    const { user } = useUser();
    const userName = user?.name?.split(' ')[0] || null;

    const cards = [
        {
            title: 'Active Projects',
            description: 'Coordinate your knowledge nodes and trigger deep synchronizations across platforms.',
            href: '/dashboard/projects',
            icon: FolderSync,
            action: 'Manage Projects',
            delay: 0.1
        },
        {
            title: 'Infrastructure Usage',
            description: 'Monitor your node capacity, API throughput, and protocol execution metrics.',
            href: '/dashboard/usage',
            icon: Database,
            action: 'View Analytics',
            delay: 0.2
        },
        {
            title: 'Billing & Tiers',
            description: 'Expand your node architecture by upgrading to a higher performance synthesis tier.',
            href: '/dashboard/billing',
            icon: Sparkles,
            action: 'Upgrade Now',
            delay: 0.3
        }
    ];

    return (
        <div className="space-y-12 pb-12">
            <div>
                <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber mb-3 block"
                >
                    System Overview
                </motion.span>
                <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight leading-none mb-4"
                >
                    {userName ? `Welcome, ${userName}.` : 'Welcome back.'}
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-neutral-500 text-[14px] font-mono max-w-lg leading-relaxed"
                >
                    Your node network is healthy and synchronized. Select a module to begin managing your knowledge synthesis.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link key={card.title} href={card.href} className="group block focus:outline-none">
                        <DashboardCard delay={card.delay} className="h-full flex flex-col min-h-[280px]">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 w-fit mb-8 group-hover:bg-amber/10 group-hover:border-amber/20 transition-all duration-500">
                                <card.icon className="w-6 h-6 text-neutral-400 group-hover:text-amber transition-colors" />
                            </div>

                            <h2 className="text-xl font-serif font-bold text-white mb-3 group-hover:text-amber transition-colors">{card.title}</h2>
                            <p className="text-neutral-500 text-[12px] font-mono leading-relaxed mb-10 flex-1">
                                {card.description}
                            </p>

                            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-neutral-400 group-hover:text-white transition-colors mt-auto">
                                <span>{card.action}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </DashboardCard>
                    </Link>
                ))}
            </div>

            {/* Subtle System Status Footer */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Protocol Active</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">v1.2.4-stable</span>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Latent Latency</span>
                        <span className="text-[12px] font-mono text-neutral-400">12ms</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Global Sync</span>
                        <span className="text-[12px] font-mono text-neutral-400">99.9%</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
