'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

function TextNode({ id, data, selected }: NodeProps) {
    const [text, setText] = useState(data.text || '');
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
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Subscribe to color
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const accentColor = nodeData?.color === 'indigo-500' ? '#4f9eff' : (nodeData?.color || '#4f9eff');

    // Debounced sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text !== data.text) {
                updateNodeAndPersist(id, {
                    data: { ...data, text }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [text, id, updateNodeAndPersist, data]);

    return (
        <>
            <NodeResizer
                minWidth={150}
                minHeight={80}
                isVisible={selected}
                lineClassName="border-[#4f9eff]/50"
                handleClassName="h-2 w-2 bg-[#0e1012] border border-[#4f9eff] rounded-sm"
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[272px]
                    rounded-[10px] bg-[#161a1e] border transition-all duration-200
                    ${selected
                        ? `border-[#4f9eff]/50 shadow-[0_0_0_1px_rgba(79,158,255,0.18),0_8px_32px_rgba(0,0,0,0.5)]`
                        : `border-white/5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-white/5">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M1.5 3h10M1.5 6.5h7M1.5 10h8" stroke="#4f9eff" strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className="flex-1 font-mono text-[12.5px] font-medium text-[#d4d8de] tracking-tight truncate">
                        {data.label || 'Untitled'}
                    </div>
                    <div className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-[7px] py-[2px] rounded-[3px] border border-[#4f9eff]/20 bg-[#4f9eff]/10 text-[#4f9eff] leading-snug">
                        Text
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-3">
                    <textarea
                        className="w-full bg-transparent border-none outline-none resize-none font-mono text-[12px] font-light text-[#d4d8de]/50 focus:text-[#d4d8de] placeholder-[#d4d8de]/20 leading-[1.65] caret-[#4f9eff] min-h-[52px] nodrag"
                        placeholder="Type something..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                    />
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

export default memo(TextNode);
