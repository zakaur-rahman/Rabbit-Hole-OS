'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { FileText, ExternalLink } from 'lucide-react';

export interface ArticleNodeData {
    title: string;
    url?: string;
    favicon?: string;
    snippet?: string;
}

function ArticleNode({ data, selected }: NodeProps<ArticleNodeData>) {
    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={60}
                isVisible={true}
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
                {/* Glow effect when selected */}
                {selected && (
                    <div className="absolute inset-0 rounded-xl bg-green-500/5 -z-10" />
                )}

                {/* Icon & Title */}
                <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate leading-tight">
                            {data.title || 'Untitled'}
                        </h3>
                        {data.url && (
                            <p className="text-xs text-neutral-500 truncate mt-0.5">
                                {new URL(data.url).hostname}
                            </p>
                        )}
                    </div>
                </div>

                {/* Snippet preview */}
                {data.snippet && (
                    <p className="text-xs text-neutral-400 mt-2 line-clamp-2">
                        {data.snippet}
                    </p>
                )}

                {/* External link indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={12} className="text-neutral-500" />
                </div>

                {/* Handles */}
                <Handle
                    type="source"
                    position={Position.Top}
                    id="top"
                    className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    className="!w-2 !h-2 !bg-green-500 !border-2 !border-neutral-900"
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
            </div>
        </>
    );
}

export default memo(ArticleNode);
