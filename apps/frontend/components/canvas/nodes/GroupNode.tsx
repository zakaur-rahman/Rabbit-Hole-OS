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
                    rounded-[18px] border transition-all duration-300
                    bg-[#111311]
                    ${selected
                        ? `border-[${accentColor === 'green-500' ? '#72b191' : accentColor}] shadow-[0_0_20px_rgba(114,177,145,0.05)]`
                        : `border-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/20 hover:border-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/40`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={selected}
                    minWidth={200}
                    minHeight={150}
                    lineClassName={`border-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/50`}
                    handleClassName={`h-2 w-2 bg-[#111311] border border-[${accentColor === 'green-500' ? '#72b191' : accentColor}] rounded-sm`}
                />

                {/* Header Section */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2">
                        <div className={`
                            px-3 py-1.5 rounded-[10px] border text-[11px] font-bold tracking-[0.12em] uppercase font-mono transition-colors
                            ${selected 
                                ? `bg-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/10 border-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/40 text-[${accentColor === 'green-500' ? '#72b191' : accentColor}]` 
                                : `bg-[#1a201c]/40 border-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/20 text-[${accentColor === 'green-500' ? '#72b191' : accentColor}]/60`}
                        `}>
                            <input
                                className="bg-transparent border-none outline-none w-28 text-center cursor-text placeholder-[#72b191]/30"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="SECTION"
                            />
                        </div>
                    </div>
                    {/* Status Dot */}
                    <div className="w-2 h-2 rounded-full bg-[#72b191] opacity-70 shadow-[0_0_12px_#72b191]" />
                </div>

                {/* Divider Line */}
                <div className="h-[1px] w-full bg-[#72b191]/10 mx-auto" />

                {/* Body Content */}
                <div className="absolute inset-0 top-[65px] flex flex-col items-center justify-center gap-5 pointer-events-none">
                    <div className="relative flex items-center justify-center opacity-40">
                        <Circle size={46} strokeWidth={1} className="text-[#525252]" />
                        <Plus size={22} strokeWidth={1} className="absolute text-[#525252]" />
                    </div>
                    <span className="text-[#525252] text-[13px] italic font-mono opacity-50 tracking-wider">
                        Drop nodes here to group
                    </span>
                </div>
            </div>
            {/* Handles with high z-index to ensure they are interactive */}
            {(isHovered || selected) && (
                <>
                    <Handle type="target" position={Position.Top} className="!w-2 !h-2 bg-[#72b191]! !border-2 !border-neutral-900 !z-50" id="top" />
                    <Handle type="source" position={Position.Right} className="!w-2 !h-2 bg-[#72b191]! !border-2 !border-neutral-900 !z-50" id="right" />
                    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 bg-[#72b191]! !border-2 !border-neutral-900 !z-50" id="bottom" />
                    <Handle type="target" position={Position.Left} className="!w-2 !h-2 bg-[#72b191]! !border-2 !border-neutral-900 !z-50" id="left" />
                </>
            )}
        </>
    );
}

export default memo(GroupNode);
