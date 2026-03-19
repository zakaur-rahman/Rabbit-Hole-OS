'use client';

import { Database, FolderSync, Zap, AlertTriangle } from 'lucide-react';
import { PLAN_LIMITS } from '@/lib/constants';
import { MetricCard } from './MetricCard';
import { DashboardCard } from './DashboardCard';

export interface UsageData {
    nodes_count: number;
    projects_count: number;
    api_calls_month: number;
    plan: 'free' | 'pro' | 'team';
}

export function UsageMeters({ usage }: { usage: UsageData }) {
    const limits = PLAN_LIMITS[usage.plan];

    const getProgressColor = (current: number, max: number) => {
        if (max === Infinity) return 'bg-amber';
        const percentage = (current / max) * 100;
        if (percentage >= 90) return 'bg-rose-500';
        if (percentage >= 75) return 'bg-orange-500';
        return 'bg-amber';
    };

    const isApproachingLimit = (current: number, max: number) => {
        if (max === Infinity) return false;
        return (current / max) >= 0.8;
    };

    const hasWarning = 
        isApproachingLimit(usage.nodes_count, limits.nodes) ||
        isApproachingLimit(usage.projects_count, limits.projects) ||
        isApproachingLimit(usage.api_calls_month, limits.api_calls);

    return (
        <div className="space-y-10">
            {hasWarning && (
                <DashboardCard hover={false} className="border-amber/30 bg-amber/5 p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-amber/10 text-amber">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-mono font-bold text-ink uppercase tracking-widest">Resource Warning</h4>
                            <p className="text-[12px] font-mono text-neutral-400 leading-relaxed">
                                You are approaching your plan limits. <a href="/dashboard/billing" className="text-amber hover:underline underline-offset-4">Upgrade your tier</a> to ensure uninterrupted knowledge synthesis and protocol execution.
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard 
                    title="Nodes Synced"
                    value={usage.nodes_count.toLocaleString()}
                    icon={Database}
                    delay={0.1}
                    progress={{
                        current: usage.nodes_count,
                        total: limits.nodes,
                        color: getProgressColor(usage.nodes_count, limits.nodes)
                    }}
                />
                <MetricCard 
                    title="Active Projects"
                    value={usage.projects_count.toLocaleString()}
                    icon={FolderSync}
                    delay={0.2}
                    progress={{
                        current: usage.projects_count,
                        total: limits.projects,
                        color: getProgressColor(usage.projects_count, limits.projects)
                    }}
                />
                <MetricCard 
                    title="API Consumption"
                    value={usage.api_calls_month.toLocaleString()}
                    icon={Zap}
                    delay={0.3}
                    progress={{
                        current: usage.api_calls_month,
                        total: limits.api_calls,
                        color: getProgressColor(usage.api_calls_month, limits.api_calls)
                    }}
                />
            </div>

            <DashboardCard delay={0.4} className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-[0.2em]">Current Active Tier</span>
                        <h3 className="text-3xl font-serif font-black text-ink capitalize">{usage.plan} Enterprise</h3>
                        <p className="text-[13px] font-mono text-neutral-500 max-w-md">
                            Your architecture is currently operating under the {usage.plan} protocol. Tier upgrades provide increased node density and priority protocol execution.
                        </p>
                    </div>
                    <a 
                        href="/dashboard/billing"
                        className="px-8 py-3.5 rounded-xl bg-ink text-paper font-mono text-[12px] uppercase tracking-widest font-bold hover:opacity-80 transition-all active:scale-95 shrink-0"
                    >
                        Review Tiers
                    </a>
                </div>
            </DashboardCard>
        </div>
    );
}
