'use client';

import React, { memo, useState, useCallback, useRef } from 'react';
import { NodeProps } from 'reactflow';
import dynamic from 'next/dynamic';
import BaseNode from './BaseNode';
import OutlineTree, { OutlineItem } from '../OutlineTree';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

const MarkdownPreview = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
    { ssr: false }
);

export interface ArticleNodeData {
    title: string;
    url?: string;
    favicon?: string;
    snippet?: string;
    outline?: OutlineItem[];
    selectedTopics?: string[];
    outlineLoading?: boolean;
    color?: string;
    hasInstruction?: boolean;
}

function ArticleNode({ data, selected, id }: NodeProps<ArticleNodeData & { isPreview?: boolean }>) {
    const [showOutline, setShowOutline] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(data.selectedTopics || []));
    const { updateNodeData } = useGraphStore();
    const [isHovered, setIsHovered] = useState(false);
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

    const isPreview = data.isPreview;
    const hasOutline = data.outline && data.outline.length > 0;

    let domain = '';
    try {
        if (data.url) {
            domain = new URL(data.url).hostname.replace('www.', '');
        }
    } catch { }

    const handleSelectionChange = useCallback((newSelectedIds: Set<string>) => {
        setSelectedIds(newSelectedIds);
        updateNodeData(id, (prevData) => ({
            ...prevData,
            selectedTopics: Array.from(newSelectedIds)
        }));
    }, [id, updateNodeData]);

    const totalTopics = data.outline?.length || 0;
    const selectedCount = selectedIds.size;

    return (
        <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative w-[300px] bg-(--surface) border rounded-xl overflow-hidden cursor-pointer transition-all duration-250 group ${
                selected 
                ? 'border-(--amber) shadow-[0_0_0_4px_rgba(232,160,32,0.08),0_12px_48px_rgba(0,0,0,0.7),0_0_24px_rgba(232,160,32,0.1)] -translate-y-0.5' 
                : 'border-(--border2) hover:border-(--amber) shadow-[0_8px_40px_rgba(0,0,0,0.65)] hover:-translate-y-0.5'
            }`}
        >
            <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
            {/* Hidden ReactFlow handles to maintain connectivity */}
            <div className="absolute inset-0 pointer-events-none opacity-0">
                <BaseNode
                    id={id}
                    selected={selected}
                    title="Hidden Article"
                    subtitle="STRUCTURE"
                    showResizer={false}
                >
                    <div />
                </BaseNode>
            </div>

            {/* Header */}
            <div className="p-3.5 pb-3 flex items-start gap-3 border-b border-(--border) bg-linear-to-br from-(--raised) to-(--raised)/60">
                <div className="w-8 h-8 rounded-lg bg-(--bg) border border-(--border) flex items-center justify-center shrink-0 text-base group-hover:border-(--border2) transition-colors">
                    {data.favicon && typeof data.favicon === 'string' ? (
                        <img src={data.favicon} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                        '📄'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-(--text) leading-relaxed tracking-tight mb-1 select-text cursor-text nodrag">
                        {data.title || 'Untitled Document'}
                    </h3>
                    {domain && (
                        <span className="font-mono text-[9px] font-normal text-(--muted) tracking-widest uppercase truncate block">
                            {domain}
                        </span>
                    )}
                </div>
                <button className="w-5.5 h-5.5 rounded-md border border-transparent hover:bg-(--raised) hover:border-(--border) text-(--muted) hover:text-(--sub) flex items-center justify-center text-sm transition-all -mt-0.5 tracking-widest nodrag">
                    ···
                </button>
            </div>

            {/* Structure Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-(--border)">
                <span className="font-mono text-[9px] font-medium tracking-[0.16em] text-(--amber) bg-(--amber)/7 border border-(--amber)/20 rounded-[5px] px-2 py-1 uppercase group-hover:bg-(--amber)/12 group-hover:border-(--amber)/35 transition-all">
                    Structure
                </span>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-(--muted)">
                        {selectedCount === 0 ? '0 topics selected' : `${selectedCount} of ${totalTopics} selected`}
                    </span>
                    <button 
                        onClick={() => setShowOutline(!showOutline)}
                        className="w-4.5 h-4.5 rounded border border-(--border) bg-(--bg) text-(--muted) hover:border-(--border2) hover:text-(--sub) flex items-center justify-center text-[10px] transition-all nodrag"
                    >
                        {showOutline ? '∧' : '∨'}
                    </button>
                </div>
            </div>

            {/* Topics List */}
            {showOutline && hasOutline && (
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar nodrag">
                    <OutlineTree
                        items={data.outline!}
                        selectedIds={selectedIds}
                        onSelectionChange={handleSelectionChange}
                        compact={false}
                    />
                </div>
            )}

            {/* Snippet (if no outline) */}
            {(!hasOutline || isPreview) && data.snippet && (
                <div className="p-4 bg-(--bg)/20 text-[13px] text-(--sub) leading-relaxed select-text cursor-text nodrag prose prose-sm prose-invert max-w-none">
                    <MarkdownPreview
                        source={data.snippet}
                        style={{
                            backgroundColor: 'transparent',
                            color: 'inherit',
                            fontSize: isPreview ? '11px' : '13px',
                            lineHeight: '1.6',
                        }}
                    />
                </div>
            )}

            {/* Footer */}
            <div className="px-3.5 py-2 border-t border-(--border) flex items-center justify-between bg-linear-to-br from-(--raised)/50 to-(--raised)">
                {data.url ? (
                    <a 
                        href={data.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-(--muted) tracking-widest hover:text-(--amber) transition-colors flex items-center gap-1.5 nodrag"
                        onClick={(e) => e.stopPropagation()}
                    >
                        ↗ Open source
                    </a>
                ) : (
                    <span className="font-mono text-[9px] text-(--muted) tracking-widest uppercase">Metadata ready</span>
                )}
                <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-(--muted) group-hover:bg-(--amber) transition-colors" />
                    <div className="w-1 h-1 rounded-full bg-(--muted) group-hover:bg-(--amber)/60 group-hover:delay-50 transition-colors" />
                    <div className="w-1 h-1 rounded-full bg-(--muted) group-hover:bg-(--amber)/30 group-hover:delay-100 transition-colors" />
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--border2);
                }
            `}</style>
        </div>
    );
}

export default memo(ArticleNode);
