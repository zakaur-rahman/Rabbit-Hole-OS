'use client';

import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

function TextNode({ id, data, selected }: NodeProps) {
    const [text, setText] = useState(data.text || '');
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Subscribe to color
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const accentColor = nodeData?.color || 'neutral-500';

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
            <NodeActionsToolbar nodeId={id} isVisible={!!selected} />
            <NodeResizer
                minWidth={100}
                minHeight={40}
                isVisible={selected}
                lineClassName={`border-${accentColor}`}
                handleClassName={`h-3 w-3 bg-neutral-900 border-2 border-${accentColor} rounded`}
            />
            <div
                className={`
                    group relative h-full w-full p-2
                    bg-neutral-900/20 backdrop-blur-sm border rounded-lg
                    transition-all duration-300
                    ${selected
                        ? `border-${accentColor} shadow-xl shadow-${accentColor}/5`
                        : `border-${accentColor}/30 hover:border-${accentColor}/80`
                    }
                `}
            >
                <textarea
                    className={`w-full h-full bg-transparent border-none outline-none resize-none text-xl font-medium text-${nodeData?.color?.replace('500', '400') || 'neutral-400'} focus:text-white placeholder-neutral-700 overflow-hidden nodrag`}
                    placeholder="Type something..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                {/* Handles - standardized */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
                    <Handle type="source" position={Position.Top} id="top" className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-top-1`} />
                    <Handle type="source" position={Position.Bottom} id="bottom" className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-bottom-1`} />
                    <Handle type="source" position={Position.Left} id="left" className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-left-1`} />
                    <Handle type="source" position={Position.Right} id="right" className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !-right-1`} />
                </div>
            </div>
        </>
    );
}

export default memo(TextNode);
