'use client';

import React from 'react';
import { useGraphStore } from '@/store/graph.store';
import { Plus, X } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';

export default function WhiteboardSelector() {
    const { 
        whiteboards, 
        activeWhiteboardId, 
        setWhiteboard, 
        updateWhiteboard, 
        closeWhiteboard, 
        openWhiteboardIds, 
        initialize, 
        createWhiteboard,
        reorderWhiteboards 
    } = useGraphStore();
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [tempName, setTempName] = React.useState('');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        initialize();
    }, [initialize]);

    const handleCreate = () => {
        createWhiteboard('New Canvas');
    };

    const startEditing = (id: string, name: string) => {
        setEditingId(id);
        setTempName(name);
    };

    const saveRename = (id: string) => {
        const trimmed = tempName.trim();
        if (trimmed) {
            // Check for duplicates
            const isDuplicate = whiteboards.some(wb => wb.id !== id && wb.name.toLowerCase() === trimmed.toLowerCase());

            if (!isDuplicate) {
                updateWhiteboard(id, trimmed);
            }
        }
        setEditingId(null);
    };

    const handleClose = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        closeWhiteboard(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        e.stopPropagation(); // Prevent global shortcuts if any
        if (e.key === 'Enter') saveRename(id);
        if (e.key === 'Escape') setEditingId(null);
    };

    if (!mounted) {
        return (
            <div className="flex items-center gap-2 bg-(--raised) border border-(--border2) rounded-(--r) px-3 py-1.5 cursor-pointer ml-2 h-[28px]">
                <span className="text-[14px]">🧠</span>
                <span className="text-[12px] font-semibold text-(--text)">Loading...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center h-[32px] gap-0">
            {/* Draggable Tab Group */}
            <Reorder.Group 
                axis="x" 
                values={openWhiteboardIds || []} 
                onReorder={reorderWhiteboards}
                className="flex items-center gap-0 overflow-x-auto no-scrollbar scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {openWhiteboardIds?.map(wbId => {
                        const wb = whiteboards.find(w => w.id === wbId);
                        if (!wb) return null;
                        
                        const isActive = activeWhiteboardId === wbId;
                        const isMain = wbId === 'main';

                        return (
                            <Reorder.Item
                                key={wb.id}
                                value={wb.id}
                                className="relative shrink-0"
                            >
                                {editingId === wb.id ? (
                                    <div className={`flex items-center px-3 h-[32px] border-x border-t rounded-t-[5px] relative -bottom-px ${isActive ? 'bg-(--bg) border-(--border) z-10' : 'bg-(--surface) border-(--border2)'}`}>
                                        {isMain && <span className="text-[14px] mr-2">🧠</span>}
                                        <input
                                            autoFocus
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            onBlur={() => saveRename(wb.id)}
                                            onKeyDown={(e) => handleKeyDown(e, wb.id)}
                                            className={`bg-transparent text-(--text) border-none p-0 h-full outline-none min-w-[80px] max-w-[150px] placeholder:text-(--muted) ${isActive ? 'text-[12px] font-bold' : 'text-[11px] font-medium'}`}
                                            placeholder="Canvas name..."
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center group relative">
                                        <button
                                            onClick={() => setWhiteboard(wb.id)}
                                            onDoubleClick={() => startEditing(wb.id, wb.name)}
                                            className={`
                                                h-[32px] px-3 flex items-center gap-2 transition-all whitespace-nowrap relative -bottom-px
                                                ${isActive 
                                                    ? 'bg-(--bg) border-x border-t border-(--border) rounded-t-[5px] text-(--text) font-bold z-10 text-[12px]' 
                                                    : 'bg-(--surface) border-t border-r border-(--border) first:border-l first:rounded-tl-[5px] text-(--sub) hover:text-(--text) hover:bg-(--raised) text-[11px] font-medium'
                                                }
                                                ${isActive ? 'pr-8' : 'pr-6'}
                                            `}
                                        >
                                            {isMain && <span className="text-[14px]">🧠</span>}
                                            <span className="truncate max-w-[120px]">{wb.name}</span>
                                        </button>
                                        
                                        {!isMain && (
                                            <button
                                                onClick={(e) => handleClose(e, wb.id)}
                                                className={`
                                                    absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-all scale-75
                                                    ${isActive 
                                                        ? 'text-(--muted) hover:text-(--red) hover:bg-(--red)/10 opacity-100' 
                                                        : 'text-(--muted) hover:text-(--red) hover:bg-(--red)/10 opacity-0 group-hover:opacity-100'
                                                    }
                                                `}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Reorder.Item>
                        );
                    })}
                </AnimatePresence>
            </Reorder.Group>

            {/* Create New Button */}
            <button
                onClick={handleCreate}
                className="ml-2 w-[24px] h-[24px] border border-dashed border-(--border2) rounded-[4px] bg-transparent text-(--sub) hover:border-(--amber) hover:text-(--amber) hover:bg-(--amber-bg) flex items-center justify-center transition-all shrink-0"
                title="New Whiteboard"
            >
                <Plus size={14} />
            </button>
        </div>
    );
}
