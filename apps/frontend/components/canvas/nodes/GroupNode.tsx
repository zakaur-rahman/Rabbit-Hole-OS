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
                    relative w-full h-full min-w-[330px] min-h-[200px]
                    rounded-[10px] bg-[#13171a] border transition-all duration-200
                    ${selected
                        ? `border-[#3ddc84]/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                        : `border-white/5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={selected}
                    minWidth={200}
                    minHeight={150}
                    lineClassName="border-[#3ddc84]/30"
                    handleClassName="h-2 w-2 bg-[#0e1012] border border-[#3ddc84] rounded-sm"
                />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-[#3ddc84]/10">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="#3ddc84" strokeOpacity="0.5" strokeWidth="1.2"/>
                            <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="#3ddc84" strokeOpacity="0.28" strokeWidth="1.2"/>
                            <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="#3ddc84" strokeOpacity="0.28" strokeWidth="1.2"/>
                            <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="#3ddc84" strokeOpacity="0.12" strokeWidth="1.2"/>
                        </svg>
                    </div>
                    <div className="flex-1 font-mono text-[10.5px] font-medium text-[#d4d8de]/60 tracking-[0.14em] uppercase truncate">
                        <input
                            className="bg-transparent border-none outline-none w-full cursor-text placeholder-[#d4d8de]/20"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="NEW SECTION"
                        />
                    </div>
                    {/* Blinking Status Dot */}
                    <div className="w-[7px] h-[7px] rounded-full bg-[#3ddc84] shadow-[0_0_7px_rgba(61,220,132,0.7)] animate-pulse" />
                </div>

                {/* Body Content */}
                <div className="p-3 h-[calc(100%-45px)]">
                    <div className={`
                        w-full h-full border border-dashed border-[#3ddc84]/15 rounded-[7px]
                        flex flex-col items-center justify-center gap-[9px]
                        transition-colors duration-200
                        ${isHovered ? 'bg-[#3ddc84]/5 border-[#3ddc84]/30' : ''}
                    `}>
                        <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-[16px] text-white/20 font-light transition-all group-hover:border-[#3ddc84]/35 group-hover:text-[#3ddc84]/60">
                            +
                        </div>
                        <div className="font-mono text-[10px] text-[#d4d8de]/20 tracking-[0.06em]">
                            Drop nodes here to group
                        </div>
                    </div>
                </div>
            </div>

            {/* Handles - standardized Cognode style */}
            {(isHovered || selected) && (
                <>
                    <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="top" />
                    <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="right" />
                    <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="bottom" />
                    <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="left" />
                </>
            )}
        </>
    );
}

export default memo(GroupNode);
