'use client';

import React, { useState, useMemo } from 'react';
import { Network, X, Search, ChevronRight, Layout } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

interface CanvasImportModalProps {
    onClose: () => void;
    onImport: (canvasId: string, name: string) => void;
}

export default function CanvasImportModal({ onClose, onImport }: CanvasImportModalProps) {
    const { whiteboards, activeWhiteboardId } = useGraphStore();
    const [search, setSearch] = useState('');

    // Filter out current canvas and potentially circular deps (if implemented)
    const availableCanvases = useMemo(() => {
        return whiteboards.filter(wb =>
            wb.id !== activeWhiteboardId &&
            wb.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [whiteboards, activeWhiteboardId, search]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Network size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Import Canvas</h2>
                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Expand your knowledge graph</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 bg-black/20 relative">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                    <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search canvases..."
                        className="w-full bg-neutral-800 border-none rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1">
                    {availableCanvases.length > 0 ? (
                        availableCanvases.map(wb => (
                            <button
                                key={wb.id}
                                onClick={() => onImport(wb.id, wb.name)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-indigo-400 transition-colors">
                                        <Layout size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-neutral-200">{wb.name}</div>
                                        <div className="text-[10px] text-neutral-500">#{wb.id}</div>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                            </button>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-xs text-neutral-600 italic">No other canvases found</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-neutral-950/20 text-center">
                    <p className="text-[10px] text-neutral-600">Select a canvas to embed it as a reference node.</p>
                </div>
            </div>
        </div>
    );
}

