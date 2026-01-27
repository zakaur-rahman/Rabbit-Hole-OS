'use client';

import React from 'react';
import { useGraphStore } from '@/store/graph.store';
import { Plus, LayoutTemplate, X } from 'lucide-react';

export default function WhiteboardSelector() {
    const { whiteboards, activeWhiteboardId, setWhiteboard, updateWhiteboard, removeWhiteboard, initialize, createWhiteboard } = useGraphStore();
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

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        removeWhiteboard(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        e.stopPropagation(); // Prevent global shortcuts if any
        if (e.key === 'Enter') saveRename(id);
        if (e.key === 'Escape') setEditingId(null);
    };

    if (!mounted) {
        return (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-full pl-1.5 pr-1 py-1 flex items-center shadow-lg max-w-[400px] h-9">
                <div className="flex items-center gap-1 overflow-x-auto flex-1 px-3">
                    <span className="text-xs font-medium text-neutral-500">Main Brain</span>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-full pl-1.5 pr-1 py-1 flex items-center shadow-lg max-w-[400px]">
            {/* Scrollable list of whiteboards */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {whiteboards.map(wb => (
                    editingId === wb.id ? (
                        <input
                            key={wb.id}
                            autoFocus
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={() => saveRename(wb.id)}
                            onKeyDown={(e) => handleKeyDown(e, wb.id)}
                            className="bg-neutral-800 text-white shadow-sm px-3 py-1.5 rounded-full text-xs font-medium border-none outline-none min-w-[60px] max-w-[120px]"
                        />
                    ) : (
                        <div key={wb.id} className="relative group">
                            <button
                                onClick={() => setWhiteboard(wb.id)}
                                onDoubleClick={() => startEditing(wb.id, wb.name)}
                                title="Double click to rename"
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 pr-2 ${activeWhiteboardId === wb.id
                                    ? 'bg-neutral-800 text-white shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                                    } ${wb.id !== 'main' ? 'group-hover:pr-6' : ''}`}
                            >
                                {wb.name}
                            </button>
                            {wb.id !== 'main' && (
                                <button
                                    onClick={(e) => handleDelete(e, wb.id)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-neutral-400 hover:text-red-400 hover:bg-neutral-700/50 opacity-0 group-hover:opacity-100 transition-all scale-90"
                                    title="Delete Canvas"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    )
                ))}
            </div>

            {/* Fixed Divider & Add Button */}
            <div className="flex items-center pl-1 shrink-0">
                <div className="w-px h-4 bg-neutral-800 mx-1" />

                <button
                    onClick={handleCreate}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    title="New Whiteboard"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}
