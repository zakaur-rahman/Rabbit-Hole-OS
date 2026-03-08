import React, { useEffect, useState } from 'react';
import { X, Cloud, CloudOff, Trash2, Plus, RefreshCw, LayoutTemplate } from 'lucide-react';
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
            <div className="w-[800px] h-[600px] bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="text-green-500" size={24} />
                        <h2 className="text-lg font-semibold text-white">Library</h2>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-medium">
                            {whiteboards.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search boards..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors w-64"
                            autoFocus
                        />
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Plus size={16} />
                            <span>New Board</span>
                        </button>
                        <div className="w-px h-6 bg-neutral-800 mx-2" />
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-4">
                        {filteredBoards.map(wb => {
                            const isSynced = !!wb.synced_at;
                            const isActive = wb.id === activeWhiteboardId;

                            return (
                                <div
                                    key={wb.id}
                                    onDoubleClick={() => handleOpen(wb.id)}
                                    onClick={() => handleOpen(wb.id)}
                                    className={`
                                        group relative aspect-video rounded-xl border p-4 flex flex-col justify-between cursor-pointer transition-all
                                        ${isActive
                                            ? 'bg-green-500/5 border-green-500/50 ring-1 ring-green-500/20'
                                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                                        }
                                    `}
                                >
                                    {/* Actions Overlay */}
                                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {wb.id !== 'main' && (
                                            <button
                                                onClick={(e) => handleDelete(e, wb.id)}
                                                className={`p-1.5 rounded-md transition-colors ${confirmDeleteId === wb.id
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-700'
                                                    }`}
                                                title="Delete Whiteboard"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Main Info */}
                                    <div>
                                        <h3 className={`font-medium truncate pr-8 ${isActive ? 'text-green-400' : 'text-neutral-200'}`}>
                                            {wb.name}
                                        </h3>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Edited {wb.updated_at ? formatDistanceToNow(wb.updated_at, { addSuffix: true }) : 'recently'}
                                        </p>
                                    </div>

                                    {/* Footer / Status */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-1.5">
                                            {isSynced ? (
                                                <>
                                                    <Cloud size={14} className="text-green-500/80" />
                                                    <span className="text-[10px] uppercase tracking-wider font-medium text-green-500/80">Synced</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CloudOff size={14} className="text-amber-500/80" />
                                                    <span className="text-[10px] uppercase tracking-wider font-medium text-amber-500/80">Unsynced</span>
                                                </>
                                            )}
                                        </div>

                                        {!isSynced && (
                                            <button
                                                onClick={(e) => handleManualSync(e, wb.id)}
                                                className="flex items-center gap-1.5 px-2 py-1 h-6 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-medium transition-colors"
                                            >
                                                <RefreshCw size={10} />
                                                Sync Now
                                            </button>
                                        )}

                                        {isActive && (
                                            <div className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-medium">
                                                Active
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
