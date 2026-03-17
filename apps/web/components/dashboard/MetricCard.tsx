'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isUp: boolean;
    };
    progress?: {
        current: number;
        total: number;
        color?: string;
    };
    delay?: number;
}

export function MetricCard({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    progress,
    delay = 0 
}: MetricCardProps) {
    const progressPercent = progress ? Math.min(100, (progress.current / progress.total) * 100) : 0;

    return (
        <DashboardCard delay={delay}>
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:bg-amber/10 group-hover:border-amber/20 group-hover:text-amber transition-all duration-300">
                    <Icon className="w-5 h-5 text-neutral-400 group-hover:text-amber transition-colors" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border",
                        trend.isUp ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-rose-400 bg-rose-400/10 border-rose-400/20"
                    )}>
                        {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend.value}%
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="text-[12px] font-mono uppercase tracking-widest text-neutral-500 font-medium">
                    {title}
                </h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-black text-white tracking-tight">
                        {value}
                    </span>
                    {progress && (
                        <span className="text-[11px] font-mono text-neutral-500">
                            / {progress.total}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-[12px] font-mono text-neutral-450 leading-relaxed mt-2">
                        {description}
                    </p>
                )}
            </div>

            {progress && (
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                        <span>Utilization</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
                            className={cn(
                                "h-full rounded-full",
                                progress.color || "bg-amber"
                            )}
                        />
                    </div>
                </div>
            )}
        </DashboardCard>
    );
}
