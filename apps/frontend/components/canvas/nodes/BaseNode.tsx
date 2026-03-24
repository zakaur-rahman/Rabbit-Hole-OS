'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { LucideIcon, MessageSquare } from 'lucide-react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useNodeTheme } from '@/hooks/useNodeTheme';

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
    onResize?: (event: unknown, params: { width: number; height: number }) => void;
    hasInstruction?: boolean;
}

function BaseNode({
    id,
    selected,
    title,
    subtitle,
    icon: Icon,
    children,
    footer,
    accentColor = 'green',
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
    const effectiveColor = nodeData?.color || accentColor;

    // Resolve theme from color name — returns CSS variables and theme object
    const { theme, style: themeStyle } = useNodeTheme(effectiveColor);

    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
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
                    lineClassName="!border-[var(--node-primary)]"
                    handleClassName="h-3 w-3 !bg-[var(--node-bg)] !border-2 !border-[var(--node-primary)] rounded"
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                />
            )}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    group relative flex flex-col h-full w-full
                    bg-(--surface) backdrop-blur-xl border rounded-(--r2)
                    transition-all duration-250 shadow-2xl
                    antialiased
                    ${selected ? '-translate-y-0.5' : 'hover:-translate-y-0.5'}
                    ${className}
                `}
                style={{
                    ...themeStyle,
                    borderColor: selected ? theme.primary : theme.border,
                    boxShadow: selected
                        ? `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 0 4px ${theme.glow}, 0 12px 48px rgba(0,0,0,0.7), 0 0 24px ${theme.glow}`
                        : `0 0 0 1px rgba(255,255,255,0.025) inset, 0 8px 40px rgba(0,0,0,0.65)`,
                    backfaceVisibility: 'hidden',
                    transform: selected ? 'translateY(-2px) translateZ(0)' : undefined,
                    WebkitFontSmoothing: 'subpixel-antialiased',
                }}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                {/* Accent line at the top */}
                <div
                    className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                        background: `linear-gradient(to right, transparent, ${theme.hover}, transparent)`,
                    }}
                />

                {/* Header */}
                <div className="flex items-center gap-2.5 p-3.5 bg-(--bg) border-b border-(--border) rounded-t-(--r2)">
                    {Icon && (
                        <div className="p-1.5 rounded-(--r) bg-(--raised) shadow-inner shrink-0 flex items-center justify-center">
                            {typeof Icon === 'string' ? (
                                <img src={Icon} alt="" className="w-3.5 h-3.5 object-contain" />
                            ) : (
                                <Icon size={14} style={{ color: theme.accent }} />
                            )}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {onTitleChange ? (
                            <input
                                className="bg-transparent border-none outline-none text-[13px] font-bold text-(--text) placeholder:text-(--muted) w-full p-0 focus:ring-0"
                                value={title}
                                onChange={(e) => onTitleChange(e.target.value)}
                                placeholder="Untitled"
                            />
                        ) : (
                            <h3 className="text-[13px] font-bold text-(--text) truncate leading-tight tracking-tight nodrag cursor-text select-text">
                                {title || 'Untitled'}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-[9px] text-(--muted) font-bold uppercase tracking-widest mt-0.5 nodrag cursor-text select-text">
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
                <div className={`flex-1 flex flex-col min-h-0 relative wrap-break-word ${!footer ? 'rounded-b-(--r2)' : ''} overflow-hidden`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-2 border-t border-(--border) bg-(--bg) rounded-b-(--r2)">
                        {footer}
                    </div>
                )}

                {/* Status Dots */}
                <div className="px-3 py-[6px] border-t border-(--border) flex items-center justify-end rounded-b-(--r2)">
                    <div className="flex gap-0.5">
                        <div className="w-1 h-1 rounded-full transition-colors" style={{ backgroundColor: isHovered ? theme.primary : 'var(--muted)' }} />
                        <div className="w-1 h-1 rounded-full transition-colors delay-50" style={{ backgroundColor: isHovered ? theme.primary : 'var(--muted)', opacity: isHovered ? 0.6 : 1 }} />
                        <div className="w-1 h-1 rounded-full transition-colors delay-100" style={{ backgroundColor: isHovered ? theme.primary : 'var(--muted)', opacity: isHovered ? 0.3 : 1 }} />
                    </div>
                </div>

                {/* Handles - Standardized for all-to-all routing */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
                    {/* Top */}
                    <Handle type="target" position={Position.Top} id="top-target"
                        className="w-2! h-2! border-2! -top-1! left-1/2! transition-transform hover:scale-150"
                        style={{ backgroundColor: theme.primary, borderColor: 'var(--bg)' }}
                    />
                    {/* Bottom */}
                    <Handle type="source" position={Position.Bottom} id="bottom-source"
                        className="w-2! h-2! border-2! -bottom-1! left-1/2! transition-transform hover:scale-150"
                        style={{ backgroundColor: theme.primary, borderColor: 'var(--bg)' }}
                    />
                    {/* Left */}
                    <Handle type="target" position={Position.Left} id="left-target"
                        className="w-2! h-2! border-2! -left-1! top-1/2! transition-transform hover:scale-150"
                        style={{ backgroundColor: theme.primary, borderColor: 'var(--bg)' }}
                    />
                    {/* Right */}
                    <Handle type="source" position={Position.Right} id="right-source"
                        className="w-2! h-2! border-2! -right-1! top-1/2! transition-transform hover:scale-150"
                        style={{ backgroundColor: theme.primary, borderColor: 'var(--bg)' }}
                    />
                </div>
            </div>
        </>
    );
}

export default memo(BaseNode);
