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

    const onNoteClick = (e: React.MouseEvent) => {
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
            minWidth={300}
            minHeight={200}
        >
            <div
                className="flex-1 cursor-text nodrag relative overflow-hidden h-full flex flex-col"
                onClick={onNoteClick}
                onDoubleClick={() => setIsEditing(true)}
            >
                {isEditing ? (
                    <TiptapEditor
                        content={content}
                        onChange={setContent}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                    />
                ) : (
                    <div className="p-4 prose prose-sm prose-invert max-w-none text-neutral-400 opacity-90 leading-relaxed overflow-hidden flex-1 h-full">
                        {content ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: content }}
                                className="h-full"
                            />
                        ) : (
                            <p className="italic text-neutral-600">Double click to start writing...</p>
                        )}
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
