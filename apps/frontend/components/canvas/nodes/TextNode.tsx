'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Eye, Edit3 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useNodeTheme } from '@/hooks/useNodeTheme';

function TextNode({ id, data, selected }: NodeProps) {
    const [text, setText] = useState(data.text || '');
    const [isHovered, setIsHovered] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Subscribe to color from node data
    const nodeColor = useGraphStore(state => state.nodes.find(n => n.id === id)?.data?.color);
    const { theme, style: themeStyle } = useNodeTheme(nodeColor || 'blue');

    // Debounced sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text !== data.text) {
                updateNodeAndPersist(id, {
                    data: { ...data, text }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [text, id, updateNodeAndPersist, data]);

    // Persist resize dimensions
    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
        const { width, height } = params;
        updateNodeAndPersist(id, {
            style: { width, height }
        });
    }, [id, updateNodeAndPersist]);

    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={80}
                isVisible={selected}
                lineClassName="!border-[var(--node-primary)]"
                handleClassName="h-2 w-2 !bg-[#0e1012] !border !border-[var(--node-primary)] rounded-sm"
                onResizeEnd={onResizeEnd}
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[280px] min-h-[160px]
                    rounded-[13px] bg-(--surface) border transition-all duration-250
                    flex flex-col overflow-hidden group
                    ${selected ? '-translate-y-0.5' : 'hover:-translate-y-0.5'}
                `}
                style={{
                    ...themeStyle,
                    borderColor: selected ? theme.primary : theme.border,
                    boxShadow: selected
                        ? `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 0 4px ${theme.glow}, 0 12px 48px rgba(0,0,0,0.7), 0 0 24px ${theme.glow}`
                        : `0 0 0 1px rgba(255,255,255,0.025) inset, 0 8px 40px rgba(0,0,0,0.65)`,
                }}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-(--border)"
                    style={{ background: 'linear-gradient(135deg, var(--raised) 0%, rgba(22,20,18,0.5) 100%)' }}
                >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M1.5 3h10M1.5 6.5h7M1.5 10h8" stroke={theme.primary} strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className="flex-1 font-mono text-[12.5px] font-medium text-[#d4d8de] tracking-tight truncate">
                        {data.label || 'Untitled'}
                    </div>
                    {/* Preview Toggle */}
                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="flex items-center gap-1.5 px-2 py-[2px] rounded-[4px] border transition-colors outline-none"
                        style={{
                            borderColor: isPreviewMode ? theme.primary : 'rgba(255,255,255,0.1)',
                            backgroundColor: isPreviewMode ? `${theme.primary}1a` : 'transparent',
                            color: isPreviewMode ? theme.primary : 'rgba(212,216,222,0.5)',
                        }}
                    >
                        {isPreviewMode ? <Edit3 size={10} /> : <Eye size={10} />}
                        <span className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase leading-snug">
                            {isPreviewMode ? 'Edit' : 'Preview'}
                        </span>
                    </button>
                    <div
                        className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-[7px] py-[2px] rounded-[3px] border leading-snug"
                        style={{
                            borderColor: `${theme.primary}33`,
                            backgroundColor: `${theme.primary}1a`,
                            color: theme.primary,
                        }}
                    >
                        Text
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-3 flex-1 flex flex-col relative min-h-0 overflow-hidden" data-color-mode="dark">
                    {isPreviewMode ? (
                        <div 
                            className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden nodrag nowheel custom-scrollbar"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            <MDEditor.Markdown 
                                source={text || '*No content*'} 
                                style={{ 
                                    backgroundColor: 'transparent',
                                    color: 'rgba(212,216,222,0.85)',
                                    fontFamily: 'inherit',
                                    fontSize: '12px',
                                    lineHeight: '1.65'
                                }}
                            />
                        </div>
                    ) : (
                        <textarea
                            className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-[12px] font-light text-[#d4d8de]/50 focus:text-[#d4d8de] placeholder-[#d4d8de]/20 leading-[1.65] min-h-[52px] nodrag nowheel"
                            style={{ caretColor: theme.primary }}
                            placeholder="Type something..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            rows={3}
                        />
                    )}
                </div>

                {/* Handles - standardized Cognode style */}
                <div className={`transition-opacity duration-300 ${(isHovered || selected) ? 'opacity-100' : 'opacity-0'}`}>
                    <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="top-target" />
                    <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="right-source" />
                    <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="bottom-source" />
                    <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="left-target" />
                </div>
            </div>
        </>
    );
}

export default memo(TextNode);
