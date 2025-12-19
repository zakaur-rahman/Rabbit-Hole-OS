'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Play, Video as VideoIcon } from 'lucide-react';

export interface VideoNodeData {
    title: string;
    url?: string;
    thumbnail?: string;
    duration?: string;
}

function VideoNode({ data, selected }: NodeProps<VideoNodeData>) {
    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={100}
                isVisible={true}
            />
            <div
                className={`
        group relative bg-neutral-900 border rounded-xl overflow-hidden h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : 'border-neutral-700 hover:border-green-500/50'
                    }
      `}
            >
                {/* Thumbnail / Placeholder */}
                <div className="relative h-24 bg-neutral-800 flex items-center justify-center">
                    {data.thumbnail ? (
                        <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" />
                    ) : (
                        <VideoIcon size={32} className="text-neutral-600" />
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <Play size={18} className="text-white ml-0.5" fill="white" />
                        </div>
                    </div>

                    {/* Duration badge */}
                    {data.duration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium text-white bg-black/80 rounded">
                            {data.duration}
                        </span>
                    )}
                </div>

                {/* Title */}
                <div className="p-3">
                    <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                        {data.title || 'Untitled Video'}
                    </h3>
                    {data.url && (
                        <p className="text-xs text-neutral-500 truncate mt-1">
                            {new URL(data.url).hostname}
                        </p>
                    )}
                </div>

                {/* Handles */}
                <Handle
                    type="source"
                    position={Position.Top}
                    id="top"
                    className="!w-2 !h-2 !bg-red-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    className="!w-2 !h-2 !bg-red-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Left}
                    id="left"
                    className="!w-2 !h-2 !bg-red-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    className="!w-2 !h-2 !bg-red-500 !border-2 !border-neutral-900"
                />
            </div>
        </>
    );
}

export default memo(VideoNode);
