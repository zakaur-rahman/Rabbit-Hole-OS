'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BookOpen, Calendar, User, CheckCircle2 } from 'lucide-react';
import BaseNode from './BaseNode';

export interface AcademicNodeData {
    title: string;
    url?: string;
    journal?: string;
    author?: string;
    date?: string;
    peerReviewed?: boolean;
    category?: 'economic' | 'military' | 'political' | 'social';
}

function AcademicNode({ data, selected, id }: NodeProps<AcademicNodeData & { color?: string }>) {
    const accentColor = data.color || "green-500";
    const iconColor = accentColor === 'green-500' ? 'text-green-400' : `text-${accentColor.replace('500', '400')}`;

    const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
        economic: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '💰' },
        military: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '⚔️' },
        political: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🏛️' },
        social: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '👤' },
    };

    const cat = data.category ? categoryColors[data.category] : null;
    let subtitle = 'Academic Paper';
    if (data.journal) subtitle = data.journal;

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title}
            subtitle={subtitle}
            icon={BookOpen}
            iconColor={iconColor}
            accentColor={accentColor}
            minHeight={100}
        >
            <div className="flex-1 p-3 pt-0">
                {/* Journal & Peer Review */}
                <div className="flex items-center gap-2 mb-3">
                    {data.peerReviewed && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                            <CheckCircle2 size={10} />
                            <span className="text-[9px] font-bold uppercase">Peer Reviewed</span>
                        </div>
                    )}
                    {cat && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 ${cat.bg} ${cat.text} rounded border border-white/5`}>
                            <span className="text-[10px]">{cat.icon}</span>
                            <span className="text-[9px] font-bold uppercase">{data.category}</span>
                        </div>
                    )}
                </div>

                {/* Author & Date */}
                <div className="space-y-1.5">
                    {data.author && (
                        <div className="flex items-center gap-2 text-neutral-400">
                            <div className="p-1 rounded-md bg-white/5">
                                <User size={10} className="text-neutral-500" />
                            </div>
                            <span className="text-[11px] font-medium truncate">{data.author}</span>
                        </div>
                    )}
                    {data.date && (
                        <div className="flex items-center gap-2 text-neutral-400">
                            <div className="p-1 rounded-md bg-white/5">
                                <Calendar size={10} className="text-neutral-500" />
                            </div>
                            <span className="text-[11px] font-medium">{data.date}</span>
                        </div>
                    )}
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AcademicNode);
