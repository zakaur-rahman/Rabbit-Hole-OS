'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface EmptyGraphStateProps {
    onExplore?: () => void;
}

export default function EmptyGraphState({ onExplore }: EmptyGraphStateProps) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            {/* Logo Icon */}
            <div className="w-12 h-12 bg-[var(--amber-bg)] rounded-[var(--r2)] flex items-center justify-center mb-4 border border-[rgba(232,160,32,0.2)] shadow-lg">
                <Sparkles size={24} className="text-[var(--amber)]" />
            </div>

            {/* Title */}
            <h2 className="text-[20px] font-bold text-[var(--text)] mb-2">Awaiting Selection</h2>

            {/* Description */}
            <p className="text-[var(--sub)] text-[13px] font-medium max-w-sm mb-6">
                Select a node from the graph to view context, relationships, and detailed data points.
            </p>

            {/* CTA Button */}
            <button
                onClick={onExplore}
                className="px-5 py-2.5 bg-[var(--raised)] hover:bg-[var(--border)] border border-[var(--border2)] rounded-[var(--r2)] text-[13px] font-semibold text-[var(--text)] flex items-center gap-2 transition-colors"
            >
                Explore Documentation
                <ArrowRight size={14} />
            </button>

            {/* Keyboard Shortcut Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full">
                    <span className="text-[var(--sub)] text-[12px] font-medium">Search Cognode...</span>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)] bg-[var(--raised)] border border-[var(--border)] rounded-[3px]">CMD</kbd>
                        <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)] bg-[var(--raised)] border border-[var(--border)] rounded-[3px]">K</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
