'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@/store/graph.store';

interface HoverPreviewProps {
    nodeId: string;
    position: { x: number; y: number };
    onClose: () => void;
}

export default function HoverPreview({ nodeId, position, onClose }: HoverPreviewProps) {
    const node = useGraphStore(state => state.nodes.find(n => n.id === nodeId));
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!node || !mounted) return null;

    const data = node.data || {};

    return createPortal(
        <div
            className="fixed z-50 w-80 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.y + 10,
                left: position.x + 10,
                maxHeight: '300px'
            }}
        >
            {/* Header */}
            <div className="p-3 border-b border-neutral-800 bg-neutral-800/50 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                    {node.type}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white leading-tight">
                    {data.title || data.label || 'Untitled Node'}
                </h4>

                {(data.snippet || data.content) && (
                    <p className="text-xs text-neutral-400 line-clamp-4 leading-relaxed">
                        {data.snippet || data.content}
                    </p>
                )}

                {data.tags && (
                    <div className="flex flex-wrap gap-1 pt-2">
                        {data.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] text-neutral-500 bg-neutral-800/50 px-1.5 py-0.5 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
