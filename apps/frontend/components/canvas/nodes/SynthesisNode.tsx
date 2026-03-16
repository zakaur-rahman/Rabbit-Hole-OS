'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Sparkles, Link2 } from 'lucide-react';
import BaseNode from './BaseNode';

export interface SynthesisNodeData {
    title: string;
    summary?: string;
    sourceCount?: number;
    color?: string;
}

function SynthesisNode({ data, selected, id }: NodeProps<SynthesisNodeData>) {
    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title || 'Synthesis'}
            subtitle="AI Synthesis"
            icon={Sparkles}
            accentColor={data.color || 'green'}
            minHeight={120}
            className="group/synthesis"
        >
            <div className="flex-1 p-3 pt-0 relative overflow-hidden">
                {/* AI Sparkle Pattern Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover/synthesis:opacity-[0.05] transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-(--node-primary)/20 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="relative space-y-3">
                    {data.summary && (
                        <p className="text-[13px] text-(--node-text) leading-relaxed font-medium whitespace-normal wrap-break-word">
                            {data.summary}
                        </p>
                    )}

                    {data.sourceCount !== undefined && (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {[...Array(Math.min(data.sourceCount, 3))].map((_, i) => (
                                    <div key={i} className="inline-flex h-4 w-4 rounded-full ring-2 ring-(--bg) bg-(--raised) items-center justify-center">
                                        <Link2 size={8} className="text-(--node-accent)" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-(--node-primary)/80 uppercase tracking-widest leading-none">
                                {data.sourceCount} Sources Linked
                            </span>
                        </div>
                    )}
                </div>

                {/* Subtle pulse for AI node */}
                {selected && (
                    <div className="absolute inset-0 bg-(--node-primary)/5 animate-pulse -z-10" />
                )}
            </div>
        </BaseNode>
    );
}

export default memo(SynthesisNode);
