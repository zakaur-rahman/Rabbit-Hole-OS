'use client';

import React, { memo, useState, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { FileEdit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/graph.store';
import BaseNode from './BaseNode';

const MDEditor = dynamic(
    () => import('@uiw/react-md-editor'),
    { ssr: false }
);

const MarkdownPreview = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
    { ssr: false }
);

export interface NoteNodeData {
    title: string;
    content: string;
    tags?: string[];
}

function NoteNode({ data, selected, id }: NodeProps<NoteNodeData>) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(data.content || '');
    const [title, setTitle] = useState(data.title || '');
    const syncLinks = useGraphStore(state => state.syncLinks);

    // Debounced sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== data.content || title !== data.title) {
                syncLinks(id, content);
                data.content = content;
                data.title = title;
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content, title, id, syncLinks, data]);

    const onEditorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={title}
            onTitleChange={setTitle}
            subtitle="Note"
            accentColor="yellow-500"
            icon={FileEdit}
            iconColor="text-yellow-400"
            minWidth={250}
            minHeight={150}
        >
            <div
                className="flex-1 cursor-text nodrag relative overflow-hidden h-full"
                onClick={onEditorClick}
                onDoubleClick={() => setIsEditing(true)}
            >
                {isEditing ? (
                    <div data-color-mode="dark" className="h-full note-editor">
                        <style>{`
                            .note-editor .w-md-editor {
                                background-color: transparent !important;
                                box-shadow: none !important;
                                height: 100% !important;
                            }
                            .note-editor .w-md-editor-toolbar {
                                background-color: rgba(23, 23, 23, 0.5) !important;
                                backdrop-blur: 8px !important;
                                border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                            }
                            .note-editor .w-md-editor-content {
                                background-color: transparent !important;
                            }
                            .note-editor textarea {
                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
                                font-size: 13px !important;
                                line-height: 1.6 !important;
                                padding: 12px !important;
                            }
                        `}</style>
                        <MDEditor
                            value={content}
                            onChange={(val) => setContent(val || '')}
                            preview="edit"
                            hideToolbar={false}
                            enableScroll={true}
                            visibleDragbar={false}
                            className="!bg-transparent"
                            onBlur={() => setIsEditing(false)}
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="p-4 prose prose-sm prose-invert max-w-none text-neutral-400 opacity-90 leading-relaxed overflow-hidden h-full">
                        <MarkdownPreview
                            source={content || '*Double click to edit...*'}
                            style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '13px' }}
                        />
                    </div>
                )}
            </div>

            {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-black/20 border-t border-white/5">
                    {data.tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-neutral-400 rounded-md font-medium">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </BaseNode>
    );
}

export default memo(NoteNode);
