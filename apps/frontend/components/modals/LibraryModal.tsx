import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

import { formatDistanceToNow } from 'date-fns';

interface LibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
    const { whiteboards, activeWhiteboardId, setWhiteboard, createWhiteboard, removeWhiteboard, fetchWhiteboards } = useGraphStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Refresh list on open
    useEffect(() => {
        if (isOpen) {
            fetchWhiteboards();
        }
    }, [isOpen, fetchWhiteboards]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        await createWhiteboard();
        onClose();
    };

    const handleOpen = async (id: string) => {
        if (id !== activeWhiteboardId) {
            await setWhiteboard(id);
        }
        onClose();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirmDeleteId === id) {
            await removeWhiteboard(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            // Auto-cancel confirmation after 3s
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const handleManualSync = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        console.log("Triggering manual sync for", id);

        // Use the new sync method
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).electron?.storage?.whiteboards?.sync) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (window as any).electron.storage.whiteboards.sync(id);
        } else {
            console.warn("Sync method not available (not electron or old version)");
        }
    };

    const filteredBoards = whiteboards.filter(wb =>
        wb.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-[800px] h-[600px] bg-(--surface) border border-(--border) rounded-(--r2) shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 font-semibold text-[14px] text-(--text)">
                        <span className="text-[16px]">📚</span>
                        <span>Local Library</span>
                        <span className="ml-2 px-2 py-0.5 rounded-(--r) bg-(--raised) text-(--sub) text-[10px] font-bold">
                            {whiteboards.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search boards..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-(--bg) border border-(--border) rounded-(--r) px-3 py-[5px] text-[12px] text-(--text) placeholder:text-(--muted) outline-none focus:border-(--amber) transition-colors w-64"
                            autoFocus
                        />
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-3 py-[5px] bg-(--amber-bg) hover:bg-(--amber-glow) text-(--amber) border border-[rgba(232,160,32,0.2)] text-[12px] font-medium rounded-(--r) transition-colors"
                        >
                            <Plus size={14} />
                            <span>New Board</span>
                        </button>
                        <div className="w-px h-5 bg-(--border) mx-1" />
                        <button
                            onClick={onClose}
                            className="w-6 h-6 border-none bg-transparent text-(--sub) hover:text-(--text) hover:bg-(--raised) rounded-(--r) grid place-items-center transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-5 border-b border-(--border) gap-5 shrink-0">
                    <div className="py-3 text-[12px] font-semibold text-(--text) cursor-pointer relative after:content-[''] after:absolute after:-bottom-px after:left-0 after:right-0 after:h-[2px] after:bg-(--amber)">
                        All Whiteboards
                    </div>
                    {/* Placeholder for future filtering */}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2 no-scrollbar">
                    {filteredBoards.map((wb, index) => {
                        const isSynced = !!wb.synced_at;
                        const isActive = wb.id === activeWhiteboardId;

                        return (
                            <div
                                key={wb.id || `wb-${index}`}
                                onDoubleClick={() => handleOpen(wb.id)}
                                onClick={() => handleOpen(wb.id)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-(--r) border cursor-pointer transition-all group
                                    ${isActive
                                        ? 'bg-(--amber-bg) border-(--amber)'
                                        : 'bg-(--raised) border-(--border) hover:border-(--border2)'
                                    }
                                `}
                            >
                                <div className="w-8 h-8 rounded-(--r) bg-(--bg) border border-(--border2) flex items-center justify-center text-[16px] shrink-0">
                                    📄
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-[13px] font-semibold truncate ${isActive ? 'text-(--amber)' : 'text-(--text)'}`}>
                                        {wb.name}
                                    </h3>
                                    <div className="text-[11px] text-(--sub) mt-0.5 flex items-center gap-2">
                                        <span>Edited {wb.updated_at ? formatDistanceToNow(wb.updated_at, { addSuffix: true }) : 'recently'}</span>
                                        <span className="text-(--border2)">•</span>
                                        <span>{isSynced ? 'Synced' : 'Local'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isActive && (
                                        <div className="px-2 py-1 rounded-(--r) bg-(--green-bg) text-(--green) text-[10px] font-bold tracking-wide uppercase">
                                            Active
                                        </div>
                                    )}

                                    {!isSynced && (
                                        <button
                                            onClick={(e) => handleManualSync(e, wb.id)}
                                            className="flex items-center gap-1.5 px-2 py-1 h-6 rounded-(--r) bg-(--amber-bg) hover:bg-(--amber-glow) text-(--amber) border border-[rgba(232,160,32,0.2)] text-[10px] font-medium transition-colors"
                                        >
                                            <RefreshCw size={10} />
                                            Sync Now
                                        </button>
                                    )}

                                    {wb.id !== 'main' && (
                                        <button
                                            onClick={(e) => handleDelete(e, wb.id)}
                                            className={`w-6 h-6 grid place-items-center rounded-[3px] transition-colors border border-transparent ${confirmDeleteId === wb.id
                                                ? 'bg-(--red) text-white'
                                                : 'text-(--sub) hover:text-(--red) hover:border-(--red) hover:bg-[rgba(224,85,85,0.1)]'
                                                }`}
                                            title="Delete Whiteboard"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
