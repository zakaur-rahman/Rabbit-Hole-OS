'use client';

import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { FileEdit, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/graph.store';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
    () => import('@uiw/react-md-editor'),
    { ssr: false }
);

// Load Markdown preview separately to avoid type issues with dynamic
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
    const syncLinks = useGraphStore(state => state.syncLinks);

    // Debounced sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== data.content) {
                syncLinks(id, content);
                data.content = content; // Update data ref for next compare
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content, id, syncLinks, data]);

    // Update local state if data changes externally
    useEffect(() => {
        if (data.content !== content) {
            setContent(data.content || '');
        }
    }, [data.content]);

    // Stop propagation to prevent dragging while editing
    const onEditorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={100}
                isVisible={true}
                lineClassName="border-yellow-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-yellow-500 rounded"
            />
            <div
                className={`
        group relative bg-neutral-900 border rounded-2xl overflow-hidden h-full w-full flex flex-col
        transition-all duration-200 shadow-xl
        ${selected
                        ? 'border-yellow-500/50 shadow-yellow-500/10'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }
      `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 bg-neutral-950/50 border-b border-neutral-800/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500">
                            <FileEdit size={14} />
                        </div>
                        <input
                            className="bg-transparent border-none outline-none text-sm font-medium text-white placeholder-neutral-600 w-full"
                            value={data.title}
                            onChange={(e) => {
                                data.title = e.target.value;
                            }}
                            placeholder="Untitled Note"
                        />
                    </div>
                    {/* Actions could go here */}
                </div>

                {/* Content */}
                <div
                    className="bg-neutral-900 flex-1 cursor-text nodrag relative overflow-hidden"
                    onClick={onEditorClick}
                    onDoubleClick={() => setIsEditing(true)}
                >
                    {isEditing ? (
                        <div data-color-mode="dark" className="h-full note-editor">
                            <style>{`
                            .note-editor .w-md-editor-toolbar {
                                background-color: #171717 !important;
                                border-bottom: 1px solid #262626 !important;
                                padding: 4px !important;
                                height: auto !important;
                                border-radius: 8px 8px 0 0 !important;
                            }
                            .note-editor .w-md-editor-toolbar li > button {
                                color: #a3a3a3 !important;
                                height: 24px !important;
                                width: 24px !important;
                            }
                            .note-editor .w-md-editor-toolbar li > button:hover {
                                background-color: #262626 !important;
                                color: #fff !important;
                            }
                            .note-editor .w-md-editor-toolbar li.active > button {
                                color: #eab308 !important; /* Yellow-500 */
                            }
                            .note-editor .w-md-editor {
                                background-color: transparent !important;
                                box-shadow: none !important;
                            }
                            .note-editor .w-md-editor-input {
                                padding: 16px !important;
                            }
                            .note-editor textarea {
                                font-family: 'Geist Mono', monospace !important;
                                font-size: 14px !important;
                                line-height: 1.6 !important;
                                background-color: #171717 !important;
                                color: #e5e5e5 !important;
                                caret-color: #eab308 !important;
                            }
                            .note-editor .w-md-editor-text,
                            .note-editor .w-md-editor-text-pre,
                            .note-editor .w-md-editor-text-input,
                            .note-editor .w-md-editor-text * {
                                color: #e5e5e5 !important;
                            }
                            /* Essential text visibility overrides */
                            .note-editor .w-md-editor-text-pre {
                                color: #e5e5e5 !important;
                            }
                            
                            /* Make input TEXT transparent but CARET visible to prevent ghosting */
                            .note-editor .w-md-editor-text-input {
                                color: transparent !important;
                                -webkit-text-fill-color: transparent !important;
                                caret-color: #eab308 !important;
                                background-color: transparent !important;
                            }

                            /* Ensure fonts match perfectly to prevent misalignment */
                            .note-editor .w-md-editor-text * {
                                font-family: 'Geist Mono', monospace !important;
                                font-size: 14px !important;
                                line-height: 1.6 !important;
                            }
                            
                            /* Container background */
                            .note-editor .w-md-editor-content {
                                background-color: #171717 !important;
                            }
                            
                            /* Syntax Highlighting overrides */
                            .note-editor .token.comment,
                            .note-editor .token.prolog,
                            .note-editor .token.doctype,
                            .note-editor .token.cdata {
                                color: #6b7280 !important;
                            }
                            /* ... rest of syntax colors ... */
                            .note-editor .token.punctuation {
                                color: #9ca3af !important;
                            }
                            .note-editor .token.property,
                            .note-editor .token.tag,
                            .note-editor .token.constant,
                            .note-editor .token.symbol,
                            .note-editor .token.deleted {
                                color: #f87171 !important;
                            }
                            .note-editor .token.boolean,
                            .note-editor .token.number {
                                color: #60a5fa !important;
                            }
                            .note-editor .token.selector,
                            .note-editor .token.attr-name,
                            .note-editor .token.string,
                            .note-editor .token.char,
                            .note-editor .token.builtin,
                            .note-editor .token.url,
                            .note-editor .token.inserted {
                                color: #34d399 !important;
                            }
                            .note-editor .token.atrule,
                            .note-editor .token.attr-value,
                            .note-editor .token.keyword {
                                color: #a78bfa !important;
                            }
                        `}</style>
                            <MDEditor
                                value={content}
                                onChange={(val) => setContent(val || '')}
                                preview="edit"
                                hideToolbar={false}
                                enableScroll={false}
                                height="100%"
                                visibleDragbar={false}
                                className="!bg-neutral-900 !border-none"
                                textareaProps={{
                                    className: '!bg-neutral-900 !text-sm !text-neutral-300 !font-mono'
                                }}
                            />
                        </div>
                    ) : (
                        <div className="p-4 prose prose-sm prose-invert max-w-none line-clamp-[12] text-neutral-400 whitespace-pre-wrap text-sm leading-relaxed">
                            <MarkdownPreview
                                source={content || '*Double click to edit...*'}
                                style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: 'inherit' }}
                            />
                        </div>
                    )}
                </div>

                {/* Updates Footer / Tags */}
                {data.tags && data.tags.length > 0 && (
                    <div className="px-3 py-2 border-t border-neutral-800/50 flex flex-wrap gap-1.5 bg-neutral-900">
                        {data.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-md font-medium">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Interactive Handles (Visible on Hover/Selected) */}
                <div className={`transition-opacity duration-200 ${selected || 'group-hover:opacity-100 opacity-0'}`}>
                    <Handle type="source" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-yellow-500 !border-2 !border-neutral-900 !-top-1.5" />
                    <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-yellow-500 !border-2 !border-neutral-900 !-bottom-1.5" />
                    <Handle type="source" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !bg-yellow-500 !border-2 !border-neutral-900 !-left-1.5" />
                    <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !bg-yellow-500 !border-2 !border-neutral-900 !-right-1.5" />
                </div>
            </div>
        </>
    );
}

export default memo(NoteNode);
