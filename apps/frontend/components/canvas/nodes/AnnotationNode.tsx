import React, { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

const AnnotationNode = ({ id, data, selected }: NodeProps) => {
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);
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

    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
        const { width, height } = params;
        updateNodeAndPersist(id, {
            style: { width, height }
        });
    }, [id, updateNodeAndPersist]);

    return (
        <>
            <NodeResizer
                minWidth={50}
                minHeight={50}
                isVisible={selected}
                lineClassName="border-blue-500"
                handleClassName="h-3 w-3 bg-neutral-900 border-2 border-blue-500 rounded"
                onResizeEnd={onResizeEnd}
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`relative h-full w-full pointer-events-auto transition-all duration-300 ${selected ? 'ring-2 ring-blue-500/50 rounded-lg shadow-lg shadow-blue-500/10' : ''}`}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${data.width || 100} ${data.height || 100}`}
                    className="overflow-visible"
                    style={{ pointerEvents: 'none' }}
                >
                    <path
                        d={data.path}
                        fill="none"
                        stroke={data.color || '#3b82f6'}
                        strokeWidth={data.strokeWidth || 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>

                {/* Handles - standardized but invisible unless hovered */}
                <div className={`transition-opacity duration-300 ${selected ? 'opacity-100' : 'opacity-0'}`}>
                    <Handle type="source" position={Position.Top} id="top" className="bg-blue-500! -top-1! opacity-0 hover:opacity-100" />
                    <Handle type="source" position={Position.Bottom} id="bottom" className="bg-blue-500! -bottom-1! opacity-0 hover:opacity-100" />
                </div>
            </div>
        </>
    );
};

export default memo(AnnotationNode);
