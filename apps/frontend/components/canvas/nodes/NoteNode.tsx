import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import TiptapEditor from '../TiptapEditor';

export interface NoteNodeData {
    title: string;
    content: string;
    tags?: string[];
}

function NoteNode({ id, data, selected }: NodeProps<NoteNodeData & { isPreview?: boolean, color?: string }>) {
    const isPreview = data.isPreview;
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(data.content || '');
    const [title, setTitle] = useState(data.title || '');
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const syncLinks = useGraphStore(state => state.syncLinks);
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

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
        <>
            <NodeResizer
                minWidth={272}
                minHeight={150}
                isVisible={selected}
                lineClassName="border-[#f5a623]/50"
                handleClassName="h-2 w-2 bg-[#0e1012] border border-[#f5a623] rounded-sm"
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[350px]
                    rounded-[10px] bg-[#191817] border transition-all duration-200
                    ${selected
                        ? `border-[#f5a623]/50 shadow-[0_0_0_1px_rgba(245,166,35,0.18),0_8px_32px_rgba(0,0,0,0.5)]`
                        : `border-white/5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-white/5">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M2.5 1.5H8l3 3v7.5H2.5V1.5z" stroke="#f5a623" strokeOpacity="0.6" strokeWidth="1.2"/>
                            <path d="M8 1.5V4.5H11" stroke="#f5a623" strokeOpacity="0.35" strokeWidth="1.2"/>
                            <path d="M4.5 7h4M4.5 9h2.5" stroke="#f5a623" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className="flex-1 font-mono text-[12.5px] font-medium text-[#d4d8de] tracking-tight truncate">
                        <input
                            className="bg-transparent border-none outline-none w-full cursor-text placeholder-[#d4d8de]/20"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="New Note"
                        />
                    </div>
                    <div className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-[7px] py-[2px] rounded-[3px] border border-[#f5a623]/22 bg-[#f5a623]/08 text-[#f5a623] shadow-[0_0_0_1px_rgba(245,166,35,0.08)] leading-snug">
                        Note
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-3">
                    <div className="font-mono text-[9px] text-[#d4d8de]/20 tracking-[0.08em] uppercase mb-[9px]">
                        NOTE · {new Date().toISOString().split('T')[0]}
                    </div>
                    <div
                        className={`flex-1 ${isPreview ? '' : 'cursor-text'} nodrag relative min-h-[58px] flex flex-col`}
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
                            <div className="font-mono text-[11.5px] font-light text-[#d4d8de]/50 leading-[1.7] whitespace-normal wrap-break-word">
                                {content ? (
                                    <div dangerouslySetInnerHTML={{ __html: content }} />
                                ) : (
                                    <span className="italic text-[#d4d8de]/20">Double click to start writing...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-[10px] pt-[9px] border-t border-white/5">
                        <span className="font-mono text-[9px] text-[#d4d8de]/20 tracking-[0.06em]">Modified just now</span>
                        <div className="flex gap-[5px]">
                            <button className="w-[22px] h-[22px] rounded-[5px] border border-white/5 bg-transparent flex items-center justify-center cursor-pointer text-[#d4d8de]/20 hover:border-white/10 hover:text-[#d4d8de]/50 hover:bg-white/5 transition-all outline-none">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1h3.5l4.5 4.5L5.5 9 1 4.5V1z" stroke="currentColor" strokeWidth="1.1"/><circle cx="3.2" cy="3.2" r="0.7" fill="currentColor"/></svg>
                            </button>
                            <button className="w-[22px] h-[22px] rounded-[5px] border border-white/5 bg-transparent flex items-center justify-center cursor-pointer text-[#d4d8de]/20 hover:border-white/10 hover:text-[#d4d8de]/50 hover:bg-white/5 transition-all outline-none">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="2" cy="5" r="1" fill="currentColor"/><circle cx="5" cy="5" r="1" fill="currentColor"/><circle cx="8" cy="5" r="1" fill="currentColor"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Handles - standardized Cognode style */}
                <div className={`transition-opacity duration-300 ${(isHovered || selected) ? 'opacity-100' : 'opacity-0'}`}>
                    <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="top-target" />
                    <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="right-source" />
                    <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="bottom-source" />
                    <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="left-target" />
                </div>
            </div>
        </>
    );
}

export default memo(NoteNode);
