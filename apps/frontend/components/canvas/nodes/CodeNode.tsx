'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Code, CheckCircle } from 'lucide-react';
import BaseNode from './BaseNode';

export interface CodeNodeData {
    title: string;
    url?: string;
    language?: string;
    upvotes?: number;
    source?: string; // stackoverflow, github, etc.
    solved?: boolean;
}

function CodeNode({ data, selected, id }: NodeProps<CodeNodeData>) {
    const sourceColors: Record<string, string> = {
        stackoverflow: 'bg-orange-500/20 text-orange-400',
        github: 'bg-purple-500/20 text-purple-400',
        docs: 'bg-blue-500/20 text-blue-400',
    };

    let subtitle = 'Code';
    if (data.source) subtitle = data.source;

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title}
            subtitle={subtitle}
            icon={Code}
            iconColor="text-orange-400"
            accentColor="orange-500"
            minHeight={80}
        >
            <div className="flex-1 p-3 pt-0">
                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                    {data.language && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-white/5 text-orange-200 rounded border border-white/5 uppercase">
                            {data.language}
                        </span>
                    )}
                    {data.solved && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                            <CheckCircle size={10} />
                            <span className="text-[10px] font-bold uppercase">Solved</span>
                        </div>
                    )}
                </div>

                {/* Upvotes */}
                {data.upvotes !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${Math.min(data.upvotes / 10, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 whitespace-nowrap">{data.upvotes} UPVOTES</span>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(CodeNode);
