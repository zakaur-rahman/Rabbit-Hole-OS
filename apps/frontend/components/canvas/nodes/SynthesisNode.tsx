'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Sparkles, Link2 } from 'lucide-react';

export interface SynthesisNodeData {
    title: string;
    summary?: string;
    sourceCount?: number;
}

function SynthesisNode({ data, selected }: NodeProps<SynthesisNodeData>) {
    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={100}
                isVisible={true}
                lineClassName="border-green-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-green-500 rounded"
            />
            <div
                className={`
        group relative bg-gradient-to-br from-neutral-900 to-neutral-800 border rounded-2xl p-4 h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-green-500 shadow-xl shadow-green-500/30'
                        : 'border-green-500/30 hover:border-green-500/60'
                    }
      `}
            >
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent -z-10" />

                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white leading-tight">
                            {data.title || 'Synthesis'}
                        </h3>
                        {data.sourceCount && (
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <Link2 size={10} />
                                {data.sourceCount} Connected Sources
                            </p>
                        )}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                    <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                        {data.summary}
                    </p>
                )}

                {/* Handles - multiple connection points */}
                <Handle
                    type="source"
                    position={Position.Top}
                    id="top"
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Left}
                    id="left"
                    className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-neutral-900"
                />
            </div>
        </>
    );
}

export default memo(SynthesisNode);
