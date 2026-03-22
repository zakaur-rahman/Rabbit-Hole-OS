import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { NodeProps, NodeResizer, Position, Handle } from 'reactflow';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useGraphStore } from '@/store/graph.store';
import { useNodeTheme } from '@/hooks/useNodeTheme';

function GroupNode({ id, data, selected }: NodeProps) {
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

    // Subscribe to color from node data
    const nodeColor = useGraphStore(state => state.nodes.find(n => n.id === id)?.data?.color);
    const { theme, style: themeStyle } = useNodeTheme(nodeColor || 'green');

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

    // Persist resize dimensions
    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
        const { width, height } = params;
        updateNodeAndPersist(id, {
            style: { width, height }
        });
    }, [id, updateNodeAndPersist]);

    return (
        <>
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[330px] min-h-[200px]
                    rounded-[10px] bg-[#191817] border transition-all duration-200
                `}
                style={{
                    ...themeStyle,
                    borderColor: selected ? theme.hover : 'rgba(255,255,255,0.05)',
                    boxShadow: selected
                        ? `0 8px 32px rgba(0,0,0,0.5)`
                        : undefined,
                }}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
                <NodeResizer
                    isVisible={selected}
                    minWidth={200}
                    minHeight={150}
                    lineClassName="!border-[var(--node-primary)]"
                    handleClassName="h-2 w-2 !bg-[#0e1012] !border !border-[var(--node-primary)] rounded-sm"
                    onResizeEnd={onResizeEnd}
                />

                {/* Header Section */}
                <div
                    className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b"
                    style={{ borderBottomColor: `${theme.primary}1a` }}
                >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke={theme.primary} strokeOpacity="0.5" strokeWidth="1.2"/>
                            <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke={theme.primary} strokeOpacity="0.28" strokeWidth="1.2"/>
                            <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke={theme.primary} strokeOpacity="0.28" strokeWidth="1.2"/>
                            <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke={theme.primary} strokeOpacity="0.12" strokeWidth="1.2"/>
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
                    <div
                        className="w-[7px] h-[7px] rounded-full animate-pulse"
                        style={{
                            backgroundColor: theme.primary,
                            boxShadow: `0 0 7px ${theme.primary}b3`,
                        }}
                    />
                </div>

                {/* Body Content */}
                <div className="p-3 h-[calc(100%-45px)]">
                    <div
                        className={`
                            w-full h-full border border-dashed rounded-[7px]
                            flex flex-col items-center justify-center gap-[9px]
                            transition-colors duration-200
                        `}
                        style={{
                            borderColor: isHovered ? `${theme.primary}4d` : `${theme.primary}26`,
                            backgroundColor: isHovered ? `${theme.primary}0d` : undefined,
                        }}
                    >
                        <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-[16px] text-white/20 font-light transition-all">
                            +
                        </div>
                        <div className="font-mono text-[10px] text-[#d4d8de]/20 tracking-[0.06em]">
                            Drop nodes here to group
                        </div>
                    </div>
                </div>
                {/* Handles - standardized Cognode style */}
                <div className={`transition-opacity duration-300 ${(isHovered || selected) ? 'opacity-100' : 'opacity-0'}`}>
                    <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="top-target" />
                    <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="right-source" />
                    <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="bottom-source" />
                    <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="left-target" />
                </div>
            </div>
        </>
    );
}

export default memo(GroupNode);
