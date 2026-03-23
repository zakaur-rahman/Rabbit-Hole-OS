'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Play, Video as VideoIcon } from 'lucide-react';
import BaseNode from './BaseNode';

export interface VideoNodeData {
    title: string;
    url?: string;
    thumbnail?: string;
    duration?: string;
}

function VideoNode({ data, selected, id }: NodeProps<VideoNodeData & { isPreview?: boolean, color?: string }>) {
    const isPreview = data.isPreview;
    const accentColor = data.color || 'red';
    let subtitle = 'Video';
    try {
        if (data.url) {
            subtitle = new URL(data.url).hostname.replace('www.', '');
        }
    } catch { }

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title}
            subtitle={subtitle}
            icon={VideoIcon}
            accentColor={accentColor}
            minHeight={120}
            showResizer={!isPreview}
        >
            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Thumbnail / Placeholder */}
                <div className={`relative flex-1 ${isPreview ? 'min-h-[80px]' : 'min-h-[96px]'} bg-neutral-800/50 flex items-center justify-center overflow-hidden`}>
                    {data.thumbnail ? (
                        <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                            <VideoIcon size={isPreview ? 24 : 32} className="text-neutral-600 opacity-50" />
                        </div>
                    )}

                    {/* Play button overlay */}
                    {!isPreview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                            <div className="w-10 h-10 rounded-full bg-red-500 shadow-lg shadow-red-500/20 flex items-center justify-center animate-in zoom-in-75 duration-200">
                                <Play size={18} className="text-white ml-0.5" fill="white" />
                            </div>
                        </div>
                    )}

                    {/* Duration badge */}
                    {data.duration && (
                        <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 ${isPreview ? 'text-[8px]' : 'text-[10px]'} font-bold text-white bg-black/80 backdrop-blur-md rounded border border-white/10 uppercase tracking-tighter`}>
                            {data.duration}
                        </span>
                    )}
                </div>

                {data.url && !isPreview && (
                    <div className="absolute bottom-1 left-2 pointer-events-none opacity-50">
                        <p className="text-[9px] text-neutral-400 truncate max-w-[100px]">
                            {data.url}
                        </p>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(VideoNode);
