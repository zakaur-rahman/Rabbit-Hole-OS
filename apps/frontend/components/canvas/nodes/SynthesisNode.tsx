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
            title={data.title || 'Synthesis Results'}
            subtitle="AI RESEARCH SYNTHESIS"
            icon={Sparkles}
            accentColor={data.color || '#6366f1'}
            minHeight={140}
            className="group/synthesis synthesis-scope"
        >
            <div className="flex-1 p-4 pt-1 relative overflow-hidden flex flex-col justify-between">
                {/* AI Sparkle Pattern Background — Enhanced with Radial Gradient and Shimmer */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none group-hover/synthesis:opacity-[0.08] transition-opacity duration-700">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,var(--synth-primary-400)/15,transparent_60%)]" />
                    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,var(--synth-primary-600)/10,transparent_50%)]" />
                </div>

                {/* Content */}
                <div className="relative space-y-3.5 z-10">
                    {data.summary && (
                        <p className="text-[13px] text-(--synth-text-secondary) leading-relaxed font-medium whitespace-normal wrap-break-word tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-500">
                            {data.summary}
                        </p>
                    )}
                </div>

                {/* Footer with Sources */}
                {data.sourceCount !== undefined && (
                    <div className="relative mt-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2.5 bg-(--synth-surface-raised)/40 backdrop-blur-sm border border-(--synth-border) rounded-full px-2.5 py-1 shadow-sm">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {[...Array(Math.min(data.sourceCount, 3))].map((_, i) => (
                                    <div key={i} className="inline-flex h-4 w-4 rounded-full ring-2 ring-(--synth-surface) bg-(--synth-primary-900) items-center justify-center border border-(--synth-primary-500)/30 transition-transform group-hover/synthesis:scale-110 duration-300" style={{ transitionDelay: `${i * 50}ms` }}>
                                        <Link2 size={8} className="text-(--synth-primary-100)" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-(--synth-primary-300) uppercase tracking-widest leading-none font-mono">
                                {data.sourceCount} {data.sourceCount === 1 ? 'Source' : 'Sources'}
                            </span>
                        </div>
                        
                        {/* Shimmer line */}
                        <div className="h-px flex-1 bg-linear-to-r from-(--synth-border) to-transparent ml-3" />
                    </div>
                )}

                {/* Animated selection glow */}
                {selected && (
                    <div className="absolute inset-0 bg-linear-to-br from-(--synth-primary-500)/5 to-transparent animate-pulse -z-10" />
                )}
            </div>
        </BaseNode>
    );
}

export default memo(SynthesisNode);
