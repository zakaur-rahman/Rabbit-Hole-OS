'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import { Folder, Clock, Database, Trash2, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
    name: string;
    description?: string;
    nodeCount: number;
    lastSync: string;
    status: 'synced' | 'syncing' | 'error' | 'idle';
    onSync?: () => void;
    onDelete?: () => void;
    delay?: number;
}

export function ProjectCard({
    name,
    description,
    nodeCount,
    lastSync,
    status,
    onSync,
    onDelete,
    delay = 0
}: ProjectCardProps) {
    const statusColors = {
        synced: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        syncing: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        error: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        idle: "text-neutral-500 bg-ink/5 border-ink/10"
    };

    return (
        <DashboardCard delay={delay} className="p-0 overflow-hidden flex flex-col h-full group/project">
            {/* Header / Banner Area */}
            <div className="h-24 bg-ink/5 relative overflow-hidden border-b border-ink/5">
                <div className="absolute inset-0 bg-linear-to-br from-amber/5 to-transparent opacity-50" />
                <div className="absolute top-4 left-6 p-2 rounded-lg bg-paper border border-ink/10 text-neutral-400 group-hover/project:text-amber transition-colors">
                    <Folder className="w-5 h-5" />
                </div>
                
                <div className="absolute top-4 right-6">
                    <div className={cn(
                        "text-[10px] font-mono uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border flex items-center gap-1.5",
                        statusColors[status]
                    )}>
                        {status === 'syncing' && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                        {status}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-7 flex-1 flex flex-col">
                <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-serif font-black text-ink group-hover/project:text-amber transition-colors">
                        {name}
                    </h3>
                    {description && (
                        <p className="text-[12px] font-mono text-neutral-500 leading-relaxed max-w-[240px]">
                            {description}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Database className="w-3.5 h-3.5" />
                            <span className="text-[13px] font-mono font-bold text-ink">{nodeCount}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Nodes Synced</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[13px] font-mono font-bold text-ink">{lastSync}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Last Activity</span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-auto pt-6 border-t border-ink/5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onSync}
                            disabled={status === 'syncing'}
                            className="p-2 text-neutral-500 hover:text-ink hover:bg-ink/5 rounded-lg transition-all group/sync disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sync Now"
                        >
                            <RefreshCw className={cn("w-4 h-4", status === 'syncing' && "animate-spin text-amber")} />
                        </button>
                        <button 
                            onClick={onDelete}
                            className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                            title="Delete Project"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <button className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-neutral-400 hover:text-ink transition-colors">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            
            {/* Interactive Progress Line (Subtle) */}
            {status === 'syncing' && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-amber animate-flowPulse" style={{ width: '40%' }} />
            )}
        </DashboardCard>
    );
}
