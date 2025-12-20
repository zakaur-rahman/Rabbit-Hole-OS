'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Sparkles, Link2 } from 'lucide-react';
import BaseNode from './BaseNode';

export interface SynthesisNodeData {
    title: string;
    summary?: string;
    sourceCount?: number;
}

function SynthesisNode({ data, selected, id }: NodeProps<SynthesisNodeData>) {
    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title || 'Synthesis'}
            subtitle="AI Synthesis"
            icon={Sparkles}
            iconColor="text-green-400"
            accentColor="green-500"
            minHeight={120}
            className="group/synthesis"
        >
            <div className="flex-1 p-3 pt-0 relative overflow-hidden">
                {/* AI Sparkle Pattern Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover/synthesis:opacity-[0.05] transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500/20 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="relative space-y-3">
                    {data.summary && (
                        <p className="text-[13px] text-neutral-200 leading-relaxed font-medium whitespace-normal break-words">
                            {data.summary}
                        </p>
                    )}

                    {data.sourceCount !== undefined && (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {[...Array(Math.min(data.sourceCount, 3))].map((_, i) => (
                                    <div key={i} className="inline-block h-4 w-4 rounded-full ring-2 ring-neutral-900 bg-neutral-800 flex items-center justify-center">
                                        <Link2 size={8} className="text-green-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-green-500/80 uppercase tracking-widest leading-none">
                                {data.sourceCount} Sources Linked
                            </span>
                        </div>
                    )}
                </div>

                {/* Subtle pulse for AI node */}
                {selected && (
                    <div className="absolute inset-0 bg-green-500/5 animate-pulse -z-10" />
                )}
            </div>
        </BaseNode>
    );
}

export default memo(SynthesisNode);
