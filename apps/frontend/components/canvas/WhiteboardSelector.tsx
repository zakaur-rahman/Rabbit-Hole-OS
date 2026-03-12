'use client';

import React from 'react';
import { useGraphStore } from '@/store/graph.store';
import { Plus, X } from 'lucide-react';

export default function WhiteboardSelector() {
    const { whiteboards, activeWhiteboardId, setWhiteboard, updateWhiteboard, closeWhiteboard, openWhiteboardIds, initialize, createWhiteboard } = useGraphStore();
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

    const openWhiteboards = whiteboards.filter(wb => openWhiteboardIds?.includes(wb.id) && wb.id !== activeWhiteboardId);
    const activeObj = whiteboards.find(wb => wb.id === activeWhiteboardId);

    return (
        <div className="flex items-center h-[32px] gap-0">
            {/* Active Whiteboard (Main or Selected) */}
            <div 
                onClick={() => setWhiteboard(activeWhiteboardId)}
                className="flex items-center gap-2 bg-(--bg) border-x border-t border-(--border) rounded-t-[5px] px-3 h-[32px] cursor-pointer z-10 relative -bottom-px"
            >
                <span className="text-[14px]">🧠</span>
                <span className="text-[12px] font-bold text-(--text) tracking-tight truncate max-w-[120px]">
                    {activeObj?.name || 'Main Brain'}
                </span>
            </div>

            {/* Other Open Whiteboards */}
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar shrink-0">
                {openWhiteboards.map(wb => (
                    <div key={wb.id} className="relative group">
                        {editingId === wb.id ? (
                            <input
                                autoFocus
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={() => saveRename(wb.id)}
                                onKeyDown={(e) => handleKeyDown(e, wb.id)}
                                className="bg-(--surface) text-(--text) border-x border-t border-(--amber) px-3 h-[32px] rounded-t-[5px] text-[11px] font-medium outline-none min-w-[80px] max-w-[150px] relative -bottom-px"
                            />
                        ) : (
                            <div className="flex items-center group">
                                <button
                                    onClick={() => setWhiteboard(wb.id)}
                                    onDoubleClick={() => startEditing(wb.id, wb.name)}
                                    className="h-[32px] px-4 bg-(--surface) text-(--sub) hover:text-(--text) hover:bg-(--raised) border-t border-r border-(--border) first:border-l first:rounded-tl-[5px] transition-all whitespace-nowrap text-[11px] font-medium flex items-center gap-2 pr-6"
                                >
                                    {wb.name}
                                </button>
                                {wb.id !== 'main' && (
                                    <button
                                        onClick={(e) => handleClose(e, wb.id)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-(--muted) hover:text-(--red) hover:bg-(--red)/10 opacity-0 group-hover:opacity-100 transition-all scale-75"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

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
