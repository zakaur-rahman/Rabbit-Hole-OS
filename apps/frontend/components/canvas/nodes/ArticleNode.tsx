'use client';

import React, { memo, useState, useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { FileText, ExternalLink, List, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import BaseNode from './BaseNode';
import OutlineTree, { OutlineItem } from '../OutlineTree';
import { useGraphStore } from '@/store/graph.store';

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
}

function ArticleNode({ data, selected, id }: NodeProps<ArticleNodeData & { isPreview?: boolean }>) {
    const [showOutline, setShowOutline] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(data.selectedTopics || []));
    const { updateNodeData } = useGraphStore();

    const isWikipedia = data.url?.includes('wikipedia.org');
    const defaultColor = isWikipedia ? 'green-500' : 'blue-500';
    const accentColor = data.color || defaultColor;
    const isPreview = data.isPreview;
    const hasOutline = data.outline && data.outline.length > 0;

    // Subtitle formatting for the header
    let domain = 'Article';
    try {
        if (data.url) {
            domain = new URL(data.url).hostname.replace('www.', '');
        }
    } catch { }

    const handleSelectionChange = useCallback((newSelectedIds: Set<string>) => {
        setSelectedIds(newSelectedIds);
        // Persist selection to node data
        updateNodeData(id, (prevData) => ({
            ...prevData,
            selectedTopics: Array.from(newSelectedIds)
        }));
    }, [id, updateNodeData]);

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={data.title}
            subtitle={domain}
            icon={data.favicon || FileText}
            accentColor={accentColor}
            minWidth={hasOutline ? 440 : 380}
            minHeight={hasOutline ? 400 : 120}
            showResizer={!isPreview}
        >
            <div className={`flex-1 flex flex-col ${isPreview ? 'p-3' : 'p-5'} overflow-hidden relative`}>


                {/* Snippet section - visible when no outline or in preview */}
                {(!hasOutline || isPreview) && data.snippet && (
                    <div className="prose prose-sm prose-invert max-w-none text-neutral-200 opacity-90 leading-relaxed select-text whitespace-normal break-words">
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

                {/* Loading state for outline */}
                {data.outlineLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-neutral-400 bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-800">
                        <div className="relative">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <Sparkles size={12} className="absolute -top-1 -right-1 text-blue-400 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-neutral-300">Generating Knowledge Structure</p>
                            <p className="text-[11px] text-neutral-500">AI is analyzing article hierarchy...</p>
                        </div>
                    </div>
                )}

                {/* Outline section */}
                {hasOutline && !isPreview && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Outline header toggle */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1 px-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                        Structure
                                    </span>
                                </div>
                                <span className="text-[11px] text-neutral-500 font-medium">
                                    {selectedIds.size} topics selected
                                </span>
                            </div>
                            <button
                                onClick={() => setShowOutline(!showOutline)}
                                className="p-1 hover:bg-neutral-800 rounded-md transition-colors text-neutral-500"
                            >
                                {showOutline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        {/* Outline tree */}
                        {showOutline && (
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <OutlineTree
                                    items={data.outline!}
                                    selectedIds={selectedIds}
                                    onSelectionChange={handleSelectionChange}
                                    compact={false}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Footer link 
                {data.url && !isPreview && (
                    <div className="mt-auto pt-4 flex items-center justify-end">
                        <a
                            href={data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all text-[11px] font-medium nodrag shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink size={12} />
                            Open Source
                        </a>
                    </div>
                )}*/}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #262626;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #404040;
                }
            `}</style>
        </BaseNode>
    );
}

export default memo(ArticleNode);
