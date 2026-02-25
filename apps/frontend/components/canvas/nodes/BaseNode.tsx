'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { LucideIcon, MessageSquare } from 'lucide-react';
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
    icon?: LucideIcon | string;
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
    onResize?: (event: any, params: { width: number; height: number }) => void;
    hasInstruction?: boolean;
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
    headerRight,
    onResize,
    hasInstruction
}: BaseNodeProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 300);
    };

    // Subscribe to node data for color updates
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const effectiveAccentColor = nodeData?.color || accentColor;

    const onResizeEnd = useCallback((event: any, params: any) => {
        const { width, height } = params;
        const node = useGraphStore.getState().nodes.find((n) => n.id === id);

        if (node) {
            useGraphStore.getState().updateNodeAndPersist(id, {
                style: { width, height }
            });
        }
    }, [id]);

    return (
        <>
            {showResizer && (
                <NodeResizer
                    minWidth={minWidth}
                    minHeight={minHeight}
                    isVisible={true}
                    lineClassName={`border-${effectiveAccentColor}`}
                    handleClassName={`h-3 w-3 bg-neutral-900 border-2 border-${effectiveAccentColor} rounded`}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                />
            )}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    group relative flex flex-col h-full w-full
                    bg-neutral-900/60 backdrop-blur-xl border rounded-2xl
                    transition-all duration-300 shadow-2xl
                    antialiased
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
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                {/* Accent line at the top */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-${effectiveAccentColor}/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                {/* Header */}
                <div className="flex items-center gap-2.5 p-3.5 bg-neutral-950/20 border-b border-white/5 rounded-t-2xl">
                    {Icon && (
                        <div className={`p-1.5 rounded-lg bg-neutral-800/50 shadow-inner shrink-0 flex items-center justify-center`}>
                            {typeof Icon === 'string' ? (
                                <img src={Icon} alt="" className="w-3.5 h-3.5 object-contain" />
                            ) : (
                                <Icon size={14} className={iconColor} />
                            )}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {onTitleChange ? (
                            <input
                                className="bg-transparent border-none outline-none text-sm font-bold text-white placeholder-neutral-600 w-full p-0 focus:ring-0"
                                value={title}
                                onChange={(e) => onTitleChange(e.target.value)}
                                placeholder="Untitled"
                            />
                        ) : (
                            <h3 className="text-[13px] font-bold text-white truncate leading-tight tracking-tight nodrag cursor-text select-text">
                                {title || 'Untitled'}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5 nodrag cursor-text select-text">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {hasInstruction && (
                        <div className="mr-2 p-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center cursor-help" title="Controlled by System Instruction">
                            <MessageSquare size={12} />
                        </div>
                    )}

                    {headerRight && (
                        <div className="flex items-center shrink-0">
                            {headerRight}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className={`flex-1 flex flex-col min-h-0 relative wrap-break-word ${!footer ? 'rounded-b-2xl' : ''} overflow-hidden`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-2 border-t border-white/5 bg-neutral-950/10 rounded-b-2xl">
                        {footer}
                    </div>
                )}

                {/* Handles - Standarized for all-to-all routing */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
                    {/* Top */}
                    <Handle type="target" position={Position.Top} id="top-target" className={`w-2! h-2! bg-${effectiveAccentColor} border-2! border-neutral-900! -top-1! left-1/2! transition-transform hover:scale-150`} />

                    {/* Bottom */}
                    <Handle type="source" position={Position.Bottom} id="bottom-source" className={`w-2! h-2! bg-${effectiveAccentColor} border-2! border-neutral-900! -bottom-1! left-1/2! transition-transform hover:scale-150`} />

                    {/* Left */}
                    <Handle type="target" position={Position.Left} id="left-target" className={`w-2! h-2! bg-${effectiveAccentColor} border-2! border-neutral-900! -left-1! top-1/2! transition-transform hover:scale-150`} />

                    {/* Right */}
                    <Handle type="source" position={Position.Right} id="right-source" className={`w-2! h-2! bg-${effectiveAccentColor} border-2! border-neutral-900! -right-1! top-1/2! transition-transform hover:scale-150`} />
                </div>
            </div>
        </>
    );
}

export default memo(BaseNode);
