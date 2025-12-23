import React, { memo, useState, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { FileEdit } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import BaseNode from './BaseNode';
import TiptapEditor from '../TiptapEditor';

export interface NoteNodeData {
    title: string;
    content: string;
    tags?: string[];
}

function NoteNode({ data, selected, id }: NodeProps<NoteNodeData & { isPreview?: boolean, color?: string }>) {
    const isPreview = data.isPreview;
    const accentColor = data.color || "yellow-500";
    const iconColor = accentColor === 'yellow-500' ? 'text-yellow-400' : `text-${accentColor.replace('500', '400')}`;
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(data.content || '');
    const [title, setTitle] = useState(data.title || '');
    const syncLinks = useGraphStore(state => state.syncLinks);
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Debounced sync
    useEffect(() => {
        if (isPreview) return;
        const timer = setTimeout(() => {
            if (content !== data.content || title !== data.title) {
                syncLinks(id, content);
                updateNodeAndPersist(id, {
                    data: { ...data, content, title }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content, title, id, syncLinks, updateNodeAndPersist, data, isPreview]);

    const onNoteClick = (e: React.MouseEvent) => {
        if (isPreview) return;
        e.stopPropagation();
    };

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={title}
            onTitleChange={isPreview ? undefined : setTitle}
            subtitle="NOTE"
            accentColor={accentColor}
            icon={FileEdit}
            iconColor={iconColor}
            minWidth={300}
            minHeight={150}
            showResizer={!isPreview}
        >
            <div
                className={`flex-1 ${isPreview ? '' : 'cursor-text'} nodrag relative h-auto flex flex-col`}
                onClick={onNoteClick}
                onDoubleClick={() => !isPreview && setIsEditing(true)}
            >
                {isEditing && !isPreview ? (
                    <TiptapEditor
                        content={content}
                        onChange={setContent}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                    />
                ) : (
                    <div className={`${isPreview ? 'p-3' : 'p-5'} prose prose-sm prose-invert max-w-none text-neutral-200 opacity-90 leading-relaxed flex-1 h-auto whitespace-normal break-words`}>
                        {content ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: content }}
                                className="h-full"
                                style={{ fontSize: isPreview ? '12px' : '13px', lineHeight: '1.7' }}
                            />
                        ) : (
                            !isPreview && (
                                <p className="text-[13px] text-neutral-600 font-medium italic opacity-50">
                                    Double click to start writing...
                                </p>
                            )
                        )}
                    </div>
                )}
            </div>

            {
                data.tags && data.tags.length > 0 && !isPreview && (
                    <div className="flex flex-wrap gap-1 p-2 bg-black/20 border-t border-white/5">
                        {data.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-neutral-400 rounded-md font-medium">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )
            }
        </BaseNode >
    );
}

export default memo(NoteNode);
