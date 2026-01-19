import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer, Position, Handle } from 'reactflow';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useGraphStore } from '@/store/graph.store';

function GroupNode({ id, data, selected }: NodeProps) {
    // Subscribe to color
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const accentColor = nodeData?.color || 'green-500';
    const [label, setLabel] = useState(data.label || '');
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

    // Debounced label sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (label !== data.label) {
                updateNodeAndPersist(id, {
                    data: { ...data, label }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [label, id, updateNodeAndPersist, data]);

    return (
        <>
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
            relative w-full h-full min-w-[200px] min-h-[200px]
            rounded-xl border-[2px] transition-all duration-200
            ${selected
                        ? `border-${accentColor} shadow-xl shadow-${accentColor}/10`
                        : `border-${accentColor}/50 hover:border-${accentColor}/80`
                    }
            bg-transparent
          `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={true}
                    minWidth={100}
                    minHeight={100}
                    lineClassName={`border-${accentColor}`}
                    handleClassName={`h-3 w-3 bg-neutral-900 border-2 border-${accentColor} rounded`}
                />

                {/* Label Pill */}
                <div className="absolute w-28 overflow-hidden -top-10 justify-left">
                    <div className={`
                        flex items-center w-full px-1 py-1 rounded-md
                        border border-${accentColor}/50 bg-transparent
                        ${selected ? `border-${accentColor}` : ''}
                    `}>
                        <input
                            className={`bg-transparent border-none outline-none text-sm font-medium text-${accentColor} placeholder-${accentColor}/50 w-full transition-colors`}
                            placeholder="Untitled group"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            {/* Handles with high z-index to ensure they are interactive */}
            <Handle type="target" position={Position.Top} className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !z-50`} id="top" />
            <Handle type="source" position={Position.Right} className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !z-50`} id="right" />
            <Handle type="source" position={Position.Bottom} className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !z-50`} id="bottom" />
            <Handle type="target" position={Position.Left} className={`!w-2 !h-2 !bg-${accentColor} !border-2 !border-neutral-900 !z-50`} id="left" />
        </>
    );
}

export default memo(GroupNode);
