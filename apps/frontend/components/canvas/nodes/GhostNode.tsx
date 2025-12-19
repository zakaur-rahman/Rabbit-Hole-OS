'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { HelpCircle, AlertTriangle } from 'lucide-react';

export interface GhostNodeData {
    title: string;
    description?: string;
}

function GhostNode({ data, selected }: NodeProps<GhostNodeData>) {
    return (
        <>
            <NodeResizer
                minWidth={80}
                minHeight={60}
                isVisible={true}
                lineClassName="border-orange-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-orange-500 rounded"
            />
            <div
                className={`
        group relative bg-transparent border-2 border-dashed rounded-xl p-3 h-full w-full
        transition-all duration-200 cursor-pointer
        ${selected
                        ? 'border-orange-500'
                        : 'border-neutral-600 hover:border-orange-400'
                    }
      `}
            >
                {/* Center Icon */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-dashed border-orange-500/50 flex items-center justify-center mb-2">
                        <HelpCircle size={20} className="text-orange-400" />
                    </div>
                    <h3 className="text-xs font-medium text-orange-400 uppercase tracking-wide">
                        Missing Topic
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                        {data.title || 'Unknown'}
                    </p>
                </div>

                {/* Handles */}
                <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900 !opacity-50" />
                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900 !opacity-50" />
                <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900 !opacity-50" />
                <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-orange-500 !border-2 !border-neutral-900 !opacity-50" />
            </div>
        </>
    );
}

export default memo(GhostNode);
