'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { FileText, ExternalLink } from 'lucide-react';
import dynamic from 'next/dynamic';
import BaseNode from './BaseNode';

const MarkdownPreview = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
    { ssr: false }
);

export interface ArticleNodeData {
    title: string;
    url?: string;
    favicon?: string;
    snippet?: string;
}

function ArticleNode({ data, selected, id }: NodeProps<ArticleNodeData & { isPreview?: boolean, color?: string }>) {
    const isWikipedia = data.url?.includes('wikipedia.org');
    const defaultColor = isWikipedia ? 'green-500' : 'blue-500';
    const accentColor = data.color || defaultColor;
    const iconColor = accentColor === 'green-500' ? 'text-green-400' : (accentColor === 'blue-500' ? 'text-blue-400' : `text-${accentColor.replace('500', '400')}`);
    const isPreview = data.isPreview;

    // Subtitle formatting
    let subtitle = 'Article';
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
            icon={data.favicon || FileText}
            iconColor={iconColor}
            accentColor={accentColor}
            minWidth={320}
            minHeight={100}
            showResizer={!isPreview}
        >
            <div className={`flex-1 ${isPreview ? 'p-3 pt-1.5' : 'p-4 pt-2'} overflow-hidden relative`}>
                {/* Markdown snippet */}
                {data.snippet ? (
                    <div className="prose prose-sm prose-invert max-w-none text-neutral-200 opacity-90 leading-relaxed select-text whitespace-normal break-words">
                        <MarkdownPreview
                            source={data.snippet}
                            style={{
                                backgroundColor: 'transparent',
                                color: 'inherit',
                                fontSize: isPreview ? '11px' : '12.5px',
                                lineHeight: '1.65',
                                letterSpacing: '-0.01em'
                            }}
                        />
                    </div>
                ) : (
                    <p className="text-[11px] text-neutral-600 italic">No description available</p>
                )}

                {/* External link indicator */}
                {data.url && !isPreview && (
                    <a
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all border border-white/5 nodrag active:scale-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>

            {/* Subtle glow for Wikipedia */}
            {isWikipedia && !isPreview && (
                <div className="absolute inset-0 bg-green-500/5 -z-10 pointer-events-none" />
            )}
        </BaseNode>
    );
}

export default memo(ArticleNode);
