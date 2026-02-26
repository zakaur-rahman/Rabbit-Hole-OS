'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Database, Sparkles, FolderSync } from 'lucide-react';
import { useUser } from '@/components/providers/UserContext';

export default function DashboardOverview() {
    const { user } = useUser();
    const userName = user?.name?.split(' ')[0] || null;

    const cards = [
        {
            title: 'Active Projects',
            description: 'Manage your connected knowledge bases and trigger synchronizations.',
            href: '/dashboard/projects',
            icon: FolderSync,
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
        {
            title: 'Current Usage',
            description: 'Check your node thresholds and API consumption meters.',
            href: '/dashboard/usage',
            icon: Database,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        {
            title: 'Billing & Subscriptions',
            description: 'Upgrade your plan to unlock more nodes, features, and priority support.',
            href: '/dashboard/billing',
            icon: Sparkles,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                    {userName ? `Welcome Back, ${userName}!` : 'Welcome Back!'}
                </h1>
                <p className="text-muted-foreground">Select an option below to manage your account or view your recent activity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <Link key={card.title} href={card.href} className="group block focus:outline-none focus:ring-2 focus:ring-primary rounded-3xl">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-card/40 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-colors duration-300 rounded-3xl p-8 h-full flex flex-col relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${card.bg} ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>

                            <h2 className="text-xl font-bold text-foreground mb-3">{card.title}</h2>
                            <p className="text-muted-foreground text-sm flex-1 mb-8">{card.description}</p>

                            <div className="flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
