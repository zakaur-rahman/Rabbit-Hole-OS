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
                    bg-[#0d0f0e]
                    ${selected
                        ? `border-[#43ff9e] shadow-xl shadow-[#43ff9e]/10`
                        : `border-[#43ff9e]/30 hover:border-[#43ff9e]/50`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={selected}
                    minWidth={200}
                    minHeight={150}
                    lineClassName="border-[#43ff9e]"
                    handleClassName="h-2.5 w-2.5 bg-[#0d0f0e] border border-[#43ff9e] rounded-sm"
                />

                {/* Header Section */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                        <div className={`
                            px-3 py-1 rounded-lg border text-[11px] font-bold tracking-[0.1em] uppercase font-mono
                            ${selected 
                                ? 'bg-[#43ff9e]/10 border-[#43ff9e]/60 text-[#43ff9e]' 
                                : 'bg-transparent border-[#43ff9e]/30 text-[#43ff9e]/70'}
                        `}>
                            <input
                                className="bg-transparent border-none outline-none w-28 text-center cursor-text placeholder-[#43ff9e]/40"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="SECTION"
                            />
                        </div>
                    </div>
                    {/* Status Dot */}
                    <div className="w-2 h-2 rounded-full bg-[#43ff9e] opacity-80 shadow-[0_0_10px_#43ff9e]" />
                </div>

                {/* Divider */}
                <div className="h-[1px] w-full bg-[#43ff9e]/20" />

                {/* Body Content */}
                <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <div className="relative flex items-center justify-center opacity-30">
                        <Circle size={44} strokeWidth={1} className="text-[#43ff9e]" />
                        <Plus size={22} strokeWidth={1} className="absolute text-[#43ff9e]" />
                    </div>
                    <span className="text-[#43ff9e] text-[13px] italic font-mono opacity-30 tracking-widest">
                        Drop nodes here to group
                    </span>
                </div>
            </div>
            {/* Handles with high z-index to ensure they are interactive */}
            {(isHovered || selected) && (
                <>
                    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#43ff9e] !border-2 !border-neutral-900 !z-50" id="top" />
                    <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#43ff9e] !border-2 !border-neutral-900 !z-50" id="right" />
                    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#43ff9e] !border-2 !border-neutral-900 !z-50" id="bottom" />
                    <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#43ff9e] !border-2 !border-neutral-900 !z-50" id="left" />
                </>
            )}
        </>
    );
}

export default memo(GroupNode);
