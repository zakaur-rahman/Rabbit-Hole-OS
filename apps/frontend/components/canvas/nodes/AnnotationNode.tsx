import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

const AnnotationNode = ({ data, selected }: NodeProps) => {
    return (
        <>
            <NodeResizer
                minWidth={50}
                minHeight={50}
                isVisible={true}
                lineClassName="border-blue-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-blue-500 rounded"
            />
            <div className={`relative ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''} h-full w-full pointer-events-auto`}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${data.width} ${data.height}`}
                    className="overflow-visible"
                    style={{ pointerEvents: 'none' }}
                >
                    <path
                        d={data.path}
                        fill="none"
                        stroke={data.color || '#ef4444'}
                        strokeWidth={data.strokeWidth || 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>

                {/* Handles to allow connecting if needed, though annotations usually don't connect */}
                <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
                <Handle type="source" position={Position.Top} className="opacity-0 pointer-events-none" />
            </div>
        </>
    );
};

export default memo(AnnotationNode);
