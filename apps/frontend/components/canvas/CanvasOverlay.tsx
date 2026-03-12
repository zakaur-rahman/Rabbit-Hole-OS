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
            {/* Stats badge removed and moved to graph-toolbar */}

            {/* Knowledge Graph legend */}
            {!isEmpty && (
                <div className="absolute top-4 left-4 z-10 bg-[var(--surface)] backdrop-blur border border-[var(--border)] rounded-[var(--r2)] p-3">
                    <h3 className="text-[10px] font-bold text-[var(--text)] uppercase tracking-[0.12em] mb-2">Knowledge Graph</h3>
                    <div className="flex flex-col gap-1 text-[11px]">
                        {[
                            { color: 'bg-[var(--green)]', label: 'Articles' },
                            { color: 'bg-[var(--red)]', label: 'Videos' },
                            { color: 'bg-[var(--amber)]', label: 'Code' },
                            { color: 'bg-[var(--blue)]', label: 'Products' },
                            { color: 'bg-[var(--amber)]', label: 'Notes' },
                            { color: 'bg-[var(--blue)]', label: 'Academic' },
                            { color: 'bg-[var(--green)]', label: 'Synthesis' },
                            { color: 'bg-[var(--muted)]', label: 'Ghost' },
                            { color: 'bg-[var(--blue)]', label: 'Images' },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-[var(--sub)] font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
