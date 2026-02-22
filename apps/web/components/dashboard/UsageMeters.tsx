'use client';

import { motion } from 'framer-motion';
import { Database, FolderSync, Zap, AlertTriangle } from 'lucide-react';
import { PlanType, PLAN_LIMITS } from '@/lib/constants';

interface UsageData {
    nodes_count: number;
    projects_count: number;
    api_calls_month: number;
    plan: PlanType;
}

export function UsageMeters({ usage }: { usage: UsageData }) {
    const limits = PLAN_LIMITS[usage.plan];

    const calculateThreshold = (current: number, max: number) => {
        if (max === Infinity) return { width: 1, color: 'bg-primary', warning: false };
        const percentage = Math.min((current / max) * 100, 100);

        let colorClass = 'bg-primary';
        let warning = false;

        if (percentage >= 95) {
            colorClass = 'bg-destructive';
            warning = true;
        } else if (percentage >= 80) {
            colorClass = 'bg-orange-500';
        }

        return {
            width: percentage,
            color: colorClass,
            warning,
            label: `${Math.round(percentage)}%`
        };
    };

    const meters = [
        {
            id: 'nodes',
            title: 'Nodes Synced',
            icon: Database,
            current: usage.nodes_count,
            max: limits.nodes,
            ...calculateThreshold(usage.nodes_count, limits.nodes)
        },
        {
            id: 'projects',
            title: 'Active Projects',
            icon: FolderSync,
            current: usage.projects_count,
            max: limits.projects,
            ...calculateThreshold(usage.projects_count, limits.projects)
        },
        {
            id: 'api',
            title: 'API Calls (This Month)',
            icon: Zap,
            current: usage.api_calls_month,
            max: limits.api_calls,
            ...calculateThreshold(usage.api_calls_month, limits.api_calls)
        }
    ];

    const hasWarning = meters.some(m => m.warning);

    return (
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
            {hasWarning && (
                <div className="mb-8 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm leading-relaxed">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                        You are approaching your plan limits. <a href="/dashboard/billing" className="font-semibold underline underline-offset-2 hover:text-destructive/80 transition-colors">Upgrade to Pro</a> to avoid interruptions to your synchronization and API access.
                    </p>
                </div>
            )}

            <div className="space-y-8">
                {meters.map((meter, index) => {
                    const isUnlimited = meter.max === Infinity;
                    const displayMax = isUnlimited ? 'Unlimited' : meter.max.toLocaleString();

                    return (
                        <div key={meter.id} className="relative">
                            <div className="flex justify-between items-end mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary rounded-lg">
                                        <meter.icon className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-foreground font-medium">{meter.title}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-foreground">{meter.current.toLocaleString()}</span>
                                    <span className="text-sm text-muted-foreground"> / {displayMax} used</span>
                                </div>
                            </div>

                            {/* Progress Track */}
                            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden relative">
                                {!isUnlimited && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${meter.width}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                                        className={`h-full rounded-full ${meter.color}`}
                                    />
                                )}

                                {isUnlimited && (
                                    <div className="h-full w-full bg-linear-to-r from-primary/40 via-primary to-primary/40 rounded-full opacity-50" />
                                )}
                            </div>

                            {!isUnlimited && (
                                <div className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase flex justify-end">
                                    {meter.label} consumption
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
