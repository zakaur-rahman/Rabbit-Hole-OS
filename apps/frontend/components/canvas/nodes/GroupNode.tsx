import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer, Position, Handle } from 'reactflow';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useGraphStore } from '@/store/graph.store';
import { Plus, Circle } from 'lucide-react';

function GroupNode({ id, data, selected }: NodeProps) {
    // Subscribe to color
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const accentColor = nodeData?.color || 'green-500';
    const [label, setLabel] = useState(data.label || 'NEW SECTION');
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
                    relative w-full h-full min-w-[300px] min-h-[200px]
                    rounded-2xl border transition-all duration-200
                    bg-[#131514]
                    ${selected
                        ? `border-[var(--green)] shadow-xl shadow-[var(--green)]/5`
                        : `border-[rgba(76,175,125,0.15)] hover:border-[rgba(76,175,125,0.3)]`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={selected}
                    minWidth={200}
                    minHeight={150}
                    lineClassName="border-[var(--green)]"
                    handleClassName="h-2.5 w-2.5 bg-[#131514] border border-[var(--green)] rounded-sm"
                />

                {/* Header Section */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                        <div className={`
                            px-3 py-1 rounded-md border text-[11px] font-bold tracking-[0.1em] uppercase
                            ${selected 
                                ? 'bg-[rgba(76,175,125,0.1)] border-[rgba(76,175,125,0.4)] text-[var(--green)]' 
                                : 'bg-transparent border-[rgba(76,175,125,0.2)] text-[rgba(76,175,125,0.6)]'}
                        `}>
                            <input
                                className="bg-transparent border-none outline-none w-24 text-center cursor-text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="SECTION"
                            />
                        </div>
                    </div>
                    {/* Status Dot */}
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] opacity-40 shadow-[0_0_8px_var(--green)]" />
                </div>

                {/* Divider */}
                <div className="h-[1px] w-full bg-[rgba(76,175,125,0.1)]" />

                {/* Body Content */}
                <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <div className="relative flex items-center justify-center opacity-20">
                        <Circle size={40} strokeWidth={1} className="text-[var(--green)]" />
                        <Plus size={20} strokeWidth={1.5} className="absolute text-[var(--green)]" />
                    </div>
                    <span className="text-[var(--sub)] text-[12px] italic font-medium opacity-40 tracking-wide lowercase">
                        Drop nodes here to group
                    </span>
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
