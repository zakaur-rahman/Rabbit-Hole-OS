'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

function TextNode({ data, selected }: NodeProps) {
    return (
        <>
            <NodeResizer
                minWidth={100}
                minHeight={40}
                isVisible={true}
                lineClassName="border-neutral-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-neutral-500 rounded"
            />
            <div className="group relative h-full w-full">
                <textarea
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-xl font-medium text-neutral-400 focus:text-white placeholder-neutral-700 overflow-hidden"
                    placeholder="Type something..."
                    defaultValue={data.text}
                    onChange={(e) => {
                        data.text = e.target.value;
                    }}
                />

                {/* Handles */}
                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900" />
                <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-neutral-500 !border-2 !border-neutral-900" />
            </div>
        </>
    );
}

export default memo(TextNode);
