'use client';

import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import BrowserView from '@/components/browser/BrowserView';
import CanvasView from '@/components/canvas/CanvasView';
import Header from '@/components/ui/Header';
import SearchModal from '@/components/ui/SearchModal';
import NodeDetailsPanel from '@/components/canvas/NodeDetailsPanel';
import { useGraphStore } from '@/store/graph.store';
import FileTreeSidebar from '@/components/workspace/FileTreeSidebar';
import { Globe, FolderTree } from 'lucide-react';

export default function MainWorkspace() {
    const [showSearch, setShowSearch] = useState(false);
    const [leftPanelMode, setLeftPanelMode] = useState<'browser' | 'files'>('browser');
    const { selectedNodeId, selectNode } = useGraphStore();
    const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);

    const [showLeftPanel, setShowLeftPanel] = useState(true);

    // Keyboard shortcut for sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                setShowLeftPanel(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sync active node to open tabs
    useEffect(() => {
        if (selectedNodeId && !openNodeIds.includes(selectedNodeId)) {
            setOpenNodeIds(prev => [...prev, selectedNodeId]);
        }
    }, [selectedNodeId]);

    const handleCloseNode = (id: string) => {
        const newIds = openNodeIds.filter(n => n !== id);
        setOpenNodeIds(newIds);

        // If closing active node, switch to another one or clear selection
        if (selectedNodeId === id) {
            selectNode(newIds.length > 0 ? newIds[newIds.length - 1] : null);
        }
    };

    // ... useEffect ...

    const handleSearch = (query: string) => {
        // If searching, maybe switch to browser? Or just search modal?
        // Let's keep existing behavior for now
        console.log('Search:', query);
        setShowSearch(true);
    };

    return (
        <div className="h-screen w-screen bg-neutral-950 text-white overflow-hidden flex flex-col">
            {/* Top Header */}
            <Header onSearch={handleSearch} onToggleSidebar={() => setShowLeftPanel(prev => !prev)} />

            {/* Main Content Area */}
            <PanelGroup direction="horizontal" className="flex-1">
                {showLeftPanel && (
                    <>
                        <Panel defaultSize={40} minSize={25} className="flex flex-col bg-neutral-900 border-r border-neutral-800">
                            {/* Left Panel Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-neutral-950 border-b border-neutral-800 shrink-0">
                                <button
                                    onClick={() => setLeftPanelMode('browser')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${leftPanelMode === 'browser'
                                        ? 'bg-neutral-800 text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                                        }`}
                                >
                                    <Globe size={14} />
                                    Browser
                                </button>
                                <button
                                    onClick={() => setLeftPanelMode('files')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${leftPanelMode === 'files'
                                        ? 'bg-neutral-800 text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                                        }`}
                                >
                                    <FolderTree size={14} />
                                    Explorer
                                </button>
                            </div>

                            {/* Left Panel Content */}
                            <div className="flex-1 relative overflow-hidden">
                                <div className={`absolute inset-0 transition-opacity duration-200 ${leftPanelMode === 'browser' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                    <BrowserView />
                                </div>
                                <div className={`absolute inset-0 transition-opacity duration-200 ${leftPanelMode === 'files' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                    <FileTreeSidebar onSelectNode={selectNode} />
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="w-1.5 bg-neutral-900 hover:bg-green-500 transition-colors cursor-col-resize group">
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-0.5 h-8 bg-neutral-700 group-hover:bg-white rounded-full transition-colors" />
                            </div>
                        </PanelResizeHandle>
                    </>
                )}

                <Panel defaultSize={60} minSize={60} className="flex flex-col relative bg-neutral-900 border-l border-neutral-800">
                    <CanvasView />

                    {/* Node Details Panel (Tabs) */}
                    {openNodeIds.length > 0 && (
                        <div className="absolute inset-y-0 right-0 w-96 z-20 shadow-2xl">
                            <NodeDetailsPanel
                                nodeIds={openNodeIds}
                                activeNodeId={selectedNodeId}
                                onClose={handleCloseNode}
                                onActivate={selectNode}
                            />
                        </div>
                    )}
                </Panel>
            </PanelGroup>

            {/* Search Modal */}
            {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
        </div>
    );
}
