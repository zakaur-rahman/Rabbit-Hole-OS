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

function ArticleNode({ data, selected, id }: NodeProps<ArticleNodeData>) {
    const isWikipedia = data.url?.includes('wikipedia.org');
    const accentColor = isWikipedia ? 'green-500' : 'blue-500';
    const iconColor = isWikipedia ? 'text-green-400' : 'text-blue-400';

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
            icon={FileText}
            iconColor={iconColor}
            accentColor={accentColor}
            minWidth={320}
            minHeight={80}
        >
            <div className="flex-1 p-3 pt-0 overflow-hidden relative">
                {/* Markdown snippet */}
                {data.snippet ? (
                    <div className="prose prose-sm prose-invert max-w-none text-neutral-200 opacity-100 leading-relaxed select-text whitespace-normal break-words">
                        <MarkdownPreview
                            source={data.snippet}
                            style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '13px', lineHeight: '1.6' }}
                        />
                    </div>
                ) : (
                    <p className="text-[11px] text-neutral-500 italic">No description available</p>
                )}

                {/* External link indicator */}
                {data.url && (
                    <a
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-white transition-all nodrag"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink size={10} />
                    </a>
                )}
            </div>

            {/* Subtle glow for Wikipedia */}
            {isWikipedia && (
                <div className="absolute inset-0 bg-green-500/5 -z-10 pointer-events-none" />
            )}
        </BaseNode>
    );
}

export default memo(ArticleNode);
