'use client';

import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import BrowserView from '@/components/browser/BrowserView';
import CanvasView from '@/components/canvas/CanvasView';
import Titlebar from '@/components/ui/Titlebar';
import SearchModal from '@/components/ui/SearchModal';
import NodeDetailsPanel from '@/components/canvas/NodeDetailsPanel';
import { useGraphStore } from '@/store/graph.store';
import FileTreeSidebar from '@/components/workspace/FileTreeSidebar';
import AuthGuardModal from '@/components/modals/AuthGuardModal';
import SettingsModal from '@/components/modals/SettingsModal';
import LibraryModal from '@/components/modals/LibraryModal';

export default function MainWorkspace() {
    const [showSearch, setShowSearch] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [leftPanelMode, setLeftPanelMode] = useState<'browser' | 'files'>('browser');
    const { selectedNodeId, selectNode } = useGraphStore();
    const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);

    const [showLeftPanel, setShowLeftPanel] = useState(true);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Sidebar toggle (Cmd/Ctrl + B)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                setShowLeftPanel(prev => !prev);
            }
            // Search modal (Cmd/Ctrl + K)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Refresh nodes on auth change
    const { fetchNodes, fetchWhiteboards, clearGraph, activeWhiteboardId, initialize } = useGraphStore();
    useEffect(() => {
        const handleAuthChange = () => {
            if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
                console.log('[MainWorkspace] Auth changed (Login), refreshing data...');
                fetchWhiteboards();
                fetchNodes();
            } else {
                console.log('[MainWorkspace] Auth changed (Logout), clearing graph...');
                clearGraph();
            }
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'auth_token') {
                handleAuthChange();
            }
        };

        window.addEventListener('auth-state-changed', handleAuthChange);
        window.addEventListener('storage', handleStorage);

        // Initial setup
        initialize();
        if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
            fetchWhiteboards();
            fetchNodes();
        }

        return () => {
            window.removeEventListener('auth-state-changed', handleAuthChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, [fetchNodes, fetchWhiteboards, clearGraph, initialize, activeWhiteboardId]);

    const handleCloseNode = (id: string) => {
        const newIds = openNodeIds.filter(n => n !== id);
        setOpenNodeIds(newIds);

        if (selectedNodeId === id) {
            selectNode(newIds.length > 0 ? newIds[newIds.length - 1] : null);
        }
    };

    const handleSearch = (query: string) => {
        console.log('Search:', query);
        setShowSearch(true);
    };

    return (
        <div className="h-screen w-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden flex flex-col pt-0">
            {/* Top Titlebar */}
            <Titlebar
                onSearch={handleSearch}
                leftPanelMode={leftPanelMode}
                setLeftPanelMode={setLeftPanelMode}
                onOpenLibrary={() => setShowLibraryModal(true)}
                onOpenSettings={() => setShowSettingsModal(true)}
            />

            {/* Main Content Area */}
            <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
                {showLeftPanel && (
                    <>
                        <Panel defaultSize={40} minSize={25} className="flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
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

                        <PanelResizeHandle className="w-1.5 bg-[var(--surface)] hover:bg-[var(--border)] transition-colors cursor-col-resize group">
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-0.5 h-8 bg-[var(--border2)] group-hover:bg-[var(--text)] rounded-full transition-colors" />
                            </div>
                        </PanelResizeHandle>
                    </>
                )}

                <Panel defaultSize={60} minSize={60} className="flex flex-col relative bg-[var(--bg)] border-l border-[var(--border)]">
                    <CanvasView
                        onNodeOpen={(id) => {
                            if (!openNodeIds.includes(id)) {
                                setOpenNodeIds(prev => [...prev, id]);
                            }
                        }}
                        onPaneClick={() => setOpenNodeIds([])}
                    />

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

            {/* Auth Guard Modal */}
            <AuthGuardModal />

            {/* Settings Modal */}
            <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

            {/* Library Modal */}
            <LibraryModal isOpen={showLibraryModal} onClose={() => setShowLibraryModal(false)} />
        </div>
    );
}
