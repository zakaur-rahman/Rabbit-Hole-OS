'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { LucideIcon } from 'lucide-react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { nodesApi } from '@/lib/api';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

interface BaseNodeProps {
    id: string;
    selected?: boolean;
    title?: string;
    subtitle?: string;
    icon?: LucideIcon;
    iconColor?: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    accentColor?: string;
    showResizer?: boolean;
    minWidth?: number;
    minHeight?: number;
    className?: string;
    onTitleChange?: (title: string) => void;
    headerRight?: React.ReactNode;
}

function BaseNode({
    id,
    selected,
    title,
    subtitle,
    icon: Icon,
    iconColor = 'text-green-400',
    children,
    footer,
    accentColor = 'green-500',
    showResizer = true,
    minWidth = 150,
    minHeight = 60,
    className = '',
    onTitleChange,
    headerRight
}: BaseNodeProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    // Subscribe to node data for color updates
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const effectiveAccentColor = nodeData?.color || accentColor;

    const onResizeEnd = useCallback((event: any, params: any) => {
        const { width, height } = params;
        const node = useGraphStore.getState().nodes.find((n) => n.id === id);

        if (node) {
            nodesApi.update(id, {
                metadata: {
                    ...node.data,
                    style: { width, height }
                }
            }).catch(console.error);
        }
    }, [id]);

    return (
        <>
            <NodeActionsToolbar nodeId={id} isVisible={!!selected} />
            {showResizer && (
                <NodeResizer
                    minWidth={minWidth}
                    minHeight={minHeight}
                    isVisible={true}
                    lineClassName={`border-${effectiveAccentColor}`}
                    handleClassName={`h-3 w-3 bg-neutral-900 border-2 border-${effectiveAccentColor} rounded`}
                    onResizeEnd={onResizeEnd}
                />
            )}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    group relative flex flex-col h-auto min-h-full w-full
                    bg-neutral-900/60 backdrop-blur-xl border rounded-2xl
                    transition-all duration-300 shadow-2xl
                    antialiased subpixel-antialiased
                    ${selected
                        ? `border-${effectiveAccentColor} shadow-${effectiveAccentColor}/10 ring-1 ring-${effectiveAccentColor}/20`
                        : `border-${effectiveAccentColor}/50 hover:border-${effectiveAccentColor} shadow-black/50`
                    }
                    ${className}
                `}
                style={{
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    WebkitFontSmoothing: 'subpixel-antialiased',
                }}
            >
                {/* Accent line at the top */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${effectiveAccentColor}/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                {/* Header */}
                <div className="flex items-center gap-2.5 p-3 bg-neutral-950/20 border-b border-white/5">
                    {Icon && (
                        <div className={`p-1 rounded-lg bg-${effectiveAccentColor}/10 ${iconColor} shadow-inner shrink-0`}>
                            <Icon size={14} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {onTitleChange ? (
                            <input
                                className="bg-transparent border-none outline-none text-sm font-semibold text-white placeholder-neutral-600 w-full p-0 focus:ring-0"
                                value={title}
                                onChange={(e) => onTitleChange(e.target.value)}
                                placeholder="Untitled"
                            />
                        ) : (
                            <h3 className="text-sm font-medium text-white break-words line-clamp-2 leading-snug">
                                {title || 'Untitled'}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-[8px] text-neutral-500 truncate mt-0.5 font-small tracking-tight flex items-center gap-1 uppercase">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {headerRight && (
                        <div className="flex items-center shrink-0 pr-1">
                            {headerRight}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 relative break-words">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-2 border-t border-white/5 bg-neutral-950/10">
                        {footer}
                    </div>
                )}

                {/* Handles - Standardized for bottom-to-top routing */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
                    <Handle
                        type="source"
                        position={Position.Top}
                        id="top"
                        className={`!w-2 !h-2 !bg-${effectiveAccentColor} !border-2 !border-neutral-900 !-top-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="bottom"
                        className={`!w-2 !h-2 !bg-${effectiveAccentColor} !border-2 !border-neutral-900 !-bottom-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Left}
                        id="left"
                        className={`!w-2 !h-2 !bg-${effectiveAccentColor} !border-2 !border-neutral-900 !-left-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="right"
                        className={`!w-2 !h-2 !bg-${effectiveAccentColor} !border-2 !border-neutral-900 !-right-1 transition-transform hover:scale-150`}
                    />
                </div>
            </div>
        </>
    );
}

export default memo(BaseNode);
