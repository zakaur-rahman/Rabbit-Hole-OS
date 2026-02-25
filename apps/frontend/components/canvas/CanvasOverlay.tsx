'use client';

import React from 'react';

interface CanvasOverlayProps {
    nodeCount: number;
}

/** Stats badge + Knowledge Graph legend — static presentational overlays. */
export default function CanvasOverlay({ nodeCount }: CanvasOverlayProps) {
    const isEmpty = nodeCount === 0;

    return (
        <>
            {/* Stats badge */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isEmpty ? 'bg-neutral-500' : 'bg-green-500 animate-pulse'}`} />
                <span className="text-xs font-medium text-neutral-300">
                    {isEmpty ? 'NO NODES' : `${nodeCount} NODES`}
                </span>
            </div>

            {/* Knowledge Graph legend */}
            {!isEmpty && (
                <div className="absolute top-4 left-4 z-10 bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-xl p-3">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Knowledge Graph</h3>
                    <div className="flex flex-col gap-1 text-xs">
                        {[
                            { color: 'bg-green-500', label: 'Articles' },
                            { color: 'bg-red-500', label: 'Videos' },
                            { color: 'bg-orange-500', label: 'Code' },
                            { color: 'bg-purple-500', label: 'Products' },
                            { color: 'bg-yellow-500', label: 'Notes' },
                            { color: 'bg-blue-500', label: 'Academic' },
                            { color: 'bg-emerald-500', label: 'Synthesis' },
                            { color: 'bg-neutral-500', label: 'Ghost' },
                            { color: 'bg-cyan-500', label: 'Images' },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-neutral-400">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
