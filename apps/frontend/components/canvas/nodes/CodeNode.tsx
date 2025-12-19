'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Code, Copy, CheckCircle } from 'lucide-react';

export interface CodeNodeData {
    title: string;
    url?: string;
    language?: string;
    upvotes?: number;
    source?: string; // stackoverflow, github, etc.
    solved?: boolean;
}

function CodeNode({ data, selected }: NodeProps<CodeNodeData>) {
    const sourceColors: Record<string, string> = {
        stackoverflow: 'bg-orange-500/20 text-orange-400',
        github: 'bg-purple-500/20 text-purple-400',
        docs: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={60}
                isVisible={true}
                lineClassName="border-orange-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-orange-500 rounded"
            />
            <div
                className={`
        group relative bg-neutral-900 border rounded-xl p-3 h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                        : 'border-neutral-700 hover:border-orange-500/50'
                    }
      `}
            >
                {/* Header */}
                <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                        <Code size={16} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                            {data.title || 'Code Snippet'}
                        </h3>
                    </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {data.language && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400 rounded">
                            {data.language}
                        </span>
                    )}
                    {data.source && (
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${sourceColors[data.source] || 'bg-neutral-800 text-neutral-400'}`}>
                            {data.source}
                        </span>
                    )}
                    {data.solved && (
                        <CheckCircle size={14} className="text-green-500" />
                    )}
                </div>

                {/* Upvotes */}
                {data.upvotes !== undefined && (
                    <div className="flex items-center gap-1 mt-2 text-neutral-400">
                        <span className="text-xs">{data.upvotes} upvotes</span>
                    </div>
                )}

                {/* Handles */}
                <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900" />
            </div>
        </>
    );
}

export default memo(CodeNode);
