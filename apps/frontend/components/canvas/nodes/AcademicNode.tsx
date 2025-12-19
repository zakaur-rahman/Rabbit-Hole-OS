'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { BookOpen, Calendar, User, CheckCircle2 } from 'lucide-react';

export interface AcademicNodeData {
    title: string;
    url?: string;
    journal?: string;
    author?: string;
    date?: string;
    peerReviewed?: boolean;
    category?: 'economic' | 'military' | 'political' | 'social';
}

function AcademicNode({ data, selected }: NodeProps<AcademicNodeData>) {
    const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
        economic: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '$' },
        military: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '◆' },
        political: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🏛' },
        social: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '👥' },
    };

    const cat = data.category ? categoryColors[data.category] : null;

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
        group relative bg-neutral-900 border rounded-xl p-3 h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : 'border-neutral-700 hover:border-green-500/50'
                    }
      `}
            >
                {/* Category Badge */}
                {cat && (
                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${cat.bg} flex items-center justify-center text-sm`}>
                        <span>{cat.icon}</span>
                    </div>
                )}

                {/* Journal Badge */}
                {data.journal && (
                    <div className="flex items-center gap-1 mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded-full">
                            {data.journal}
                        </span>
                        {data.peerReviewed && (
                            <CheckCircle2 size={12} className="text-green-400" />
                        )}
                    </div>
                )}

                {/* Icon & Title */}
                <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <BookOpen size={16} className="text-green-400" />
                    </div>
                    <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                        {data.title || 'Academic Paper'}
                    </h3>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                    {data.author && (
                        <div className="flex items-center gap-1">
                            <User size={10} />
                            <span className="truncate max-w-[80px]">{data.author}</span>
                        </div>
                    )}
                    {data.date && (
                        <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{data.date}</span>
                        </div>
                    )}
                </div>

                {/* Category Label */}
                {data.category && (
                    <div className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium ${cat?.bg} ${cat?.text} text-center`}>
                        {data.category.charAt(0).toUpperCase() + data.category.slice(1)} Factors
                    </div>
                )}

                {/* Handles */}
                <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900" />
            </div>
        </>
    );
}

export default memo(AcademicNode);
