'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { LucideIcon } from 'lucide-react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

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
    onTitleChange
}: BaseNodeProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <>
            {showResizer && (
                <NodeResizer
                    minWidth={minWidth}
                    minHeight={minHeight}
                    isVisible={selected || isHovered}
                    lineClassName={`border-${accentColor}`}
                    handleClassName={`h-3 w-3 bg-neutral-900 border-2 border-${accentColor} rounded`}
                />
            )}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    group relative flex flex-col h-full w-full
                    bg-neutral-900/40 backdrop-blur-xl border rounded-2xl overflow-hidden
                    transition-all duration-300 shadow-2xl
                    ${selected
                        ? `border-${accentColor} shadow-${accentColor}/10 ring-1 ring-${accentColor}/20`
                        : 'border-neutral-800/80 hover:border-neutral-700 shadow-black/50'
                    }
                    ${className}
                `}
            >
                {/* Accent line at the top */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${accentColor}/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                {/* Header */}
                <div className="flex items-center gap-2.5 p-3 bg-neutral-950/20 border-b border-white/5">
                    {Icon && (
                        <div className={`p-1.5 rounded-lg bg-${accentColor}/10 ${iconColor} shadow-inner shrink-0`}>
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
                            <h3 className="text-sm font-semibold text-white break-words line-clamp-2 leading-snug">
                                {title || 'Untitled'}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-[10px] text-neutral-500 truncate mt-0.5 font-medium tracking-wide flex items-center gap-1 uppercase">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 relative break-words overflow-hidden">
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
                        className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-top-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="bottom"
                        className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-bottom-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Left}
                        id="left"
                        className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-left-1 transition-transform hover:scale-150`}
                    />
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="right"
                        className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-right-1 transition-transform hover:scale-150`}
                    />
                </div>
            </div>
        </>
    );
}

export default memo(BaseNode);
