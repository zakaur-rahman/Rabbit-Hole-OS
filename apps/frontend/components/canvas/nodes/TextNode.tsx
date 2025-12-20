'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

function TextNode({ data, selected }: NodeProps) {
    return (
        <>
            <NodeResizer
                minWidth={100}
                minHeight={40}
                isVisible={selected}
                lineClassName="border-neutral-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-neutral-500 rounded"
            />
            <div
                className={`
                    group relative h-full w-full p-2
                    bg-neutral-900/20 backdrop-blur-sm border rounded-lg
                    transition-all duration-300
                    ${selected
                        ? 'border-neutral-500 shadow-xl shadow-white/5'
                        : 'border-transparent hover:border-neutral-800'
                    }
                `}
            >
                <textarea
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-xl font-medium text-neutral-400 focus:text-white placeholder-neutral-700 overflow-hidden nodrag"
                    placeholder="Type something..."
                    defaultValue={data.text}
                    onChange={(e) => {
                        data.text = e.target.value;
                    }}
                />

                {/* Handles - standardized */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
                    <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900 !-top-1" />
                    <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900 !-bottom-1" />
                    <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900 !-left-1" />
                    <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900 !-right-1" />
                </div>
            </div>
        </>
    );
}

export default memo(TextNode);
