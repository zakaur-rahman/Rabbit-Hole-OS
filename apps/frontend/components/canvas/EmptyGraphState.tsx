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
            <div className="w-12 h-12 bg-linear-to-br from-green-500/20 to-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20 shadow-lg shadow-green-500/10">
                <Sparkles size={24} className="text-green-500" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">Awaiting Selection</h2>

            {/* Description */}
            <p className="text-neutral-400 max-w-sm mb-6">
                Select a node from the graph to view context, relationships, and detailed data points.
            </p>

            {/* CTA Button */}
            <button
                onClick={onExplore}
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm font-medium text-neutral-200 flex items-center gap-2 transition-colors"
            >
                Explore Documentation
                <ArrowRight size={14} />
            </button>

            {/* Keyboard Shortcut Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full">
                    <span className="text-neutral-500 text-sm">Search Cognode...</span>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-800 rounded">CMD</kbd>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-800 rounded">K</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
