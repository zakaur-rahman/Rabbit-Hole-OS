import React, { memo, useState, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import BaseNode from './BaseNode';
import TiptapEditor from '../TiptapEditor';

export interface CommentNodeData {
    title?: string;
    content: string;
    parentId?: string;
}

function CommentNode({ data, selected, id }: NodeProps<CommentNodeData>) {
    const accentColor = "amber-500";
    const iconColor = "text-amber-400";
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(data.content || '');
    const [title, setTitle] = useState(data.title || 'Instruction');
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Debounced sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== data.content || title !== data.title) {
                updateNodeAndPersist(id, {
                    data: { ...data, content, title }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content, title, id, updateNodeAndPersist, data]);

    const onNodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={title}
            onTitleChange={setTitle}
            subtitle="SYSTEM INSTRUCTION"
            accentColor={accentColor}
            icon={AlertCircle}
            iconColor={iconColor}
            minWidth={250}
            minHeight={150}
            className="border-amber-500/30 bg-amber-950/20"
        >
            <div
                className="flex-1 cursor-text nodrag relative h-auto flex flex-col"
                onClick={onNodeClick}
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
                    <div className="p-4 prose prose-sm prose-invert max-w-none text-amber-100/90 leading-relaxed flex-1 h-auto whitespace-normal break-words">
                        {content ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: content }}
                                className="h-full"
                                style={{ fontSize: '13px', lineHeight: '1.6' }}
                            />
                        ) : (
                            <p className="text-[13px] text-amber-500/50 font-medium italic">
                                Double click to add system instructions...
                            </p>
                        )}
                    </div>
                )}
            </div>
            <div className="px-3 py-1.5 bg-amber-950/40 border-t border-amber-500/20 text-[10px] text-amber-500/70 font-medium flex items-center justify-center gap-1.5">
                <MessageSquare size={10} />
                <span>Controls AI Behavior for Parent Node</span>
            </div>
        </BaseNode>
    );
}

export default memo(CommentNode);
