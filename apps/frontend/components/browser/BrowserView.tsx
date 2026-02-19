'use client';

import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe, Plus, BookmarkPlus, Share2, RefreshCw, X, Loader2 } from 'lucide-react';
import { useGraphStore, Tab } from '@/store/graph.store';
import NewTabPage from './NewTabPage';
import { resolveUrl, extractSearchQuery, normalizeUrl, detectNodeType } from '@/lib/browser-utils';

// URL pattern detectors for smart node typing moved to browser-utils.ts

// --- Browser Tab Component ---
interface BrowserTabProps {
    tab: Tab;
    isActive: boolean;
    onUpdate: (id: string, updates: Partial<Tab>) => void;
    onMount: (id: string, ref: any) => void;
    onNewTab: (url: string, parentId?: string) => void;
    activeWhiteboardId: string;
}

const BrowserTab = memo(({ tab, isActive, onUpdate, onMount, onNewTab, activeWhiteboardId }: BrowserTabProps) => {
    const webviewRef = useRef<any>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Auto-add helper refs
    const processedUrlsRef = useRef<Set<string>>(new Set());
    const currentTitleRef = useRef(tab.title);
    const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsMounted(true);
        if (webviewRef.current) {
            onMount(tab.id, webviewRef.current);
        }
    }, [tab.id, onMount]);

    useEffect(() => {
        currentTitleRef.current = tab.title;
    }, [tab.title]);

    // detectNodeType remains local or moved? For now let's leave it as it depends on detectNodeType
    // Actually normalizeUrl and extractSearchQuery were defined inside BrowserTab or BrowserView. 
    // Let's remove them from there.

    // Auto add node logic
    const autoAddNodeToGraph = useCallback((url: string, title: string) => {
        const { isAutoSyncEnabled } = useGraphStore.getState().browserStates[activeWhiteboardId] || { isAutoSyncEnabled: false };

        // Block if auto-sync is off
        if (!isAutoSyncEnabled) return;

        const urlKey = normalizeUrl(url);

        // Skip if we've already processed this URL in this tab's session (e.g., back/forward navigation)
        if (processedUrlsRef.current.has(urlKey)) {
            console.log('[Browser] Skipping already-processed URL:', urlKey);
            return;
        }

        const { nodes, addNode, addEdge } = useGraphStore.getState();

        // If URL already exists in graph, just update the tab's trace pointer and return
        const existingNode = nodes.find((n: any) => normalizeUrl(n.data?.url || '') === urlKey);
        if (existingNode) {
            onUpdate(tab.id, { lastNodeId: existingNode.id });
            useGraphStore.getState().selectNode(existingNode.id); // Sync Graph Pointer
            processedUrlsRef.current.add(urlKey);
            return;
        }

        processedUrlsRef.current.add(urlKey);

        const nodeType = detectNodeType(url);
        const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Smart Positioning: Place relative to parent if it exists
        let position = { x: 100 + (nodes.length % 4) * 280, y: 100 + Math.floor(nodes.length / 4) * 220 };
        const parentNode = tab.lastNodeId ? nodes.find(n => n.id === tab.lastNodeId) : null;

        if (parentNode) {
            position = {
                x: parentNode.position.x + (Math.random() * 40 - 20), // Slight jitter
                y: parentNode.position.y + 200
            };
        }

        let nodeData: any = {
            title: title || new URL(url).hostname,
            url: url,
            whiteboard_id: activeWhiteboardId
        };

        addNode({
            id: nodeId,
            type: nodeType,
            position,
            style: { width: 320 },
            data: nodeData,
        });

        // Sync Graph Pointer
        useGraphStore.getState().selectNode(nodeId);

        // Check auth before processing AI metadata
        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
            console.log('[Browser] AI processing skipped - User not signed in');
            return;
        }

        import('@/lib/api').then(({ nodesApi }) => {
            nodesApi.processUrl(url, activeWhiteboardId, nodeId).then(result => {
                useGraphStore.getState().updateNodeAndPersist(nodeId, {
                    data: {
                        title: result.title,
                        snippet: result.snippet,
                        favicon: result.metadata?.favicon,
                        outline: result.outline
                    }
                });
            }).catch(console.error);
        });

        // Link to parent if trace exists
        console.log('[Browser] AutoAddNode:', {
            url,
            title,
            nodeId,
            lastNodeId: tab.lastNodeId,
            tabId: tab.id
        });

        if (tab.lastNodeId && tab.lastNodeId !== nodeId) {
            console.log('[Browser] Creating edge:', tab.lastNodeId, '->', nodeId);
            addEdge({
                id: `e-${tab.lastNodeId}-${nodeId}`,
                source: tab.lastNodeId,
                sourceHandle: 'bottom-source',
                target: nodeId,
                targetHandle: 'top-target',
                animated: true,
            });
        } else {
            console.log('[Browser] NOT creating edge. Missing lastNodeId or self-loop.');
        }

        // Update tab's trace pointer
        onUpdate(tab.id, { lastNodeId: nodeId });
    }, [activeWhiteboardId, tab.id, tab.lastNodeId, onUpdate]);

    // Webview Event Listeners
    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const handleDidStartLoading = () => onUpdate(tab.id, { isLoading: true });
        const handleDidStopLoading = () => onUpdate(tab.id, { isLoading: false });

        const handleNavigation = (e: any) => {
            const url = e.url;
            let displayInput = url;
            const searchQuery = extractSearchQuery(url);
            if (searchQuery) displayInput = searchQuery;
            else displayInput = url.replace(/^https?:\/\//, '');

            onUpdate(tab.id, {
                url,
                displayInput,
                canGoBack: webview.canGoBack(),
                canGoForward: webview.canGoForward()
            });

            if (url.startsWith('http')) {
                const isSearchPage = url.includes('google.com/search') || url.includes('bing.com/search');
                if (!isSearchPage) {
                    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);

                    navigationTimeoutRef.current = setTimeout(() => {
                        autoAddNodeToGraph(url, currentTitleRef.current || url);
                    }, 800);
                }
            }
        };

        const handleTitleUpdate = (e: any) => {
            onUpdate(tab.id, {
                title: e.title,
                canGoBack: webview.canGoBack(),
                canGoForward: webview.canGoForward()
            });

            const { nodes, updateNodeAndPersist } = useGraphStore.getState();
            const targetNode = nodes.find(n => normalizeUrl(n.data?.url || '') === normalizeUrl(tab.url || ''));
            if (targetNode) {
                updateNodeAndPersist(targetNode.id, { data: { title: e.title } });
            }
        };

        const handleDomReady = () => {
            webview.insertCSS(`
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #171717; }
                ::-webkit-scrollbar-thumb { background: #404040; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #525252; }
            `);
            // Sync initial nav state
            onUpdate(tab.id, {
                canGoBack: webview.canGoBack(),
                canGoForward: webview.canGoForward()
            });
        };

        const handleNewWindow = (e: any) => {
            // Prevent default popup behavior if possible, or just manage our internal tab
            // Electron's allowpopups="true" might open a window. We want to intercept.
            // But with webview, usually we need to listen and maybe prevent default if we want to handle it ourselves.
            // For now, let's just create our internal tab.
            if (e.url) {
                onNewTab(e.url, tab.lastNodeId);
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleNavigation);
        webview.addEventListener('did-navigate-in-page', handleNavigation);
        webview.addEventListener('new-window', handleNewWindow);
        webview.addEventListener('page-title-updated', handleTitleUpdate);
        webview.addEventListener('dom-ready', handleDomReady);

        return () => {
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
            webview.removeEventListener('did-navigate', handleNavigation);
            webview.removeEventListener('did-navigate-in-page', handleNavigation);
            webview.removeEventListener('new-window', handleNewWindow);
            webview.removeEventListener('page-title-updated', handleTitleUpdate);
            webview.removeEventListener('dom-ready', handleDomReady);
        };
    }, [tab.id, onUpdate, autoAddNodeToGraph, tab.url, onNewTab, tab.lastNodeId]);

    // Ref forwarding on mount
    useEffect(() => {
        if (webviewRef.current) onMount(tab.id, webviewRef.current);
    }, [onMount, tab.id]);

    // Handle initial mount or URL change logic is distinct:
    // We pass `src={tab.url}`. If tab.url changes EXTERNALLY (address bar), webview navigates.
    // If webview navigates internally, `did-navigate` updates tab.url.

    if (!tab.url) {
        return (
            <div className="w-full h-full" style={{ display: isActive ? 'block' : 'none' }}>
                <NewTabPage onNavigate={(input) => onUpdate(tab.id, { url: resolveUrl(input), displayInput: input })} />
            </div>
        );
    }

    return (
        <div className="w-full h-full" style={{ display: isActive ? 'block' : 'none' }}>
            {isMounted && (
                <webview
                    ref={webviewRef}
                    src={tab.url}
                    className="w-full h-full"
                    // @ts-ignore
                    allowpopups="true"
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                />
            )}
        </div>
    );
});
BrowserTab.displayName = 'BrowserTab';


// --- Main BrowserView Component ---
export default function BrowserView() {
    const { activeWhiteboardId, browserStates, updateBrowserState, addNode, selectedNodeId, nodeClickTs, nodes, setAuthModal } = useGraphStore();

    // Track which whiteboards have their tabs mounted in the DOM
    const [mountedWhiteboardIds, setMountedWhiteboardIds] = useState<string[]>([activeWhiteboardId]);

    useEffect(() => {
        if (!mountedWhiteboardIds.includes(activeWhiteboardId)) {
            setMountedWhiteboardIds(prev => [...prev, activeWhiteboardId]);
        }
    }, [activeWhiteboardId, mountedWhiteboardIds]);

    // Load state from store or defaults
    const state = browserStates[activeWhiteboardId] || {
        url: '', displayInput: '', tabs: [{ id: '1', url: '', displayInput: '', title: 'New Tab' }], activeTabId: '1', isAutoSyncEnabled: false
    };

    // We use local state for immediate UI updates, sync store in background
    const [tabs, setTabs] = useState<Tab[]>(state.tabs || [{ id: '1', url: '', displayInput: '', title: 'New Tab' }]);
    const [activeTabId, setActiveTabId] = useState(state.activeTabId || '1');
    const webviewRefs = useRef<{ [key: string]: any }>({});
    const isRemoteUpdate = useRef(false);

    // Sync from store when whiteboard changes
    useEffect(() => {
        const s = browserStates[activeWhiteboardId];
        if (s) {
            const tabsMismatch = JSON.stringify(s.tabs) !== JSON.stringify(tabs);
            const activeTabMismatch = s.activeTabId !== activeTabId;

            if (tabsMismatch || activeTabMismatch) {
                isRemoteUpdate.current = true;
                if (tabsMismatch) setTabs(s.tabs || [{ id: '1', url: '', displayInput: '', title: 'New Tab' }]);
                if (activeTabMismatch) setActiveTabId(s.activeTabId || '1');
            }
        } else {
            // Reset only if switching to a new board that has no state yet
            // Check if we are already in default state to avoid loops
            const isDefault = tabs.length === 1 && tabs[0].url === '' && activeTabId === '1';
            if (!isDefault) {
                isRemoteUpdate.current = true;
                setTabs([{ id: '1', url: '', displayInput: '', title: 'New Tab' }]);
                setActiveTabId('1');
            }
        }
    }, [activeWhiteboardId, browserStates]);

    // Sync current active whiteboard tabs back to store when local state changes
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        updateBrowserState(activeWhiteboardId, {
            tabs,
            activeTabId,
            url: tabs.find(t => t.id === activeTabId)?.url || '',
            displayInput: tabs.find(t => t.id === activeTabId)?.displayInput || ''
        });
    }, [tabs, activeTabId, activeWhiteboardId, updateBrowserState]);


    // Tab Management
    const addTab = useCallback((initialUrl: string = '', parentId?: string, title?: string) => {
        const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newTab: Tab = {
            id: newId,
            url: initialUrl,
            displayInput: initialUrl,
            title: title || 'New Tab',
            lastNodeId: parentId // START TRACE FROM PARENT
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
    }, []);

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    // --- Graph -> Browser Sync ---
    // When a node is selected in the graph, switch to its tab or open it
    useEffect(() => {
        if (!selectedNodeId) return;

        // Use getState() to avoid 'nodes' dependency causing loops/re-renders
        const { nodes } = useGraphStore.getState();
        const node = nodes.find(n => n.id === selectedNodeId);
        if (!node || !node.data?.url) return;

        // Check if this URL is already open in a tab
        // We use loose matching on the URL to catch slightly different query params if needed, 
        // but exact match is safer for now. normalizeUrl might be needed?
        // Note: 'tabs' is from closure, which might be stale if effect doesn't re-run. 
        // But since selectedNodeId changed, component likely re-rendered? 
        // No, if only store updated, component might not re-render if we didn't pick 'selectedNodeId'. 
        // But we DID pick selectedNodeId. So component re-renders. 'tabs' is fresh.
        const existingTab = tabs.find(t => {
            if (!t.url || !node.data.url) return false;
            // Loose matching: ignore trailing slashes and hash
            const cleanT = t.url.split('#')[0].replace(/\/$/, '');
            const cleanN = node.data.url.split('#')[0].replace(/\/$/, '');

            return cleanT === cleanN || resolveUrl(t.url) === resolveUrl(node.data.url);
        });

        if (existingTab) {
            if (activeTabId !== existingTab.id) {
                setActiveTabId(existingTab.id);
            }
        } else {
            // Open new tab
            addTab(node.data.url, node.id, node.data.title);
        }

    }, [selectedNodeId, nodeClickTs, addTab]); // nodeClickTs fires even when same node re-clicked

    // --- Browser -> Graph Sync ---
    // When active tab changes, select the corresponding node in the graph
    useEffect(() => {
        if (!activeTab || !activeTab.url) return;

        const { nodes, selectNode, selectedNodeId } = useGraphStore.getState();
        const urlKey = normalizeUrl(activeTab.url);

        const existingNode = nodes.find((n: any) => normalizeUrl(n.data?.url || '') === urlKey);

        // Only update if different to avoid loops/jitters
        if (existingNode && existingNode.id !== selectedNodeId) {
            selectNode(existingNode.id);
        }
    }, [activeTabId, activeTab?.url]); // Run when active tab or its URL changes

    // Tab Management


    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length === 1) {
            // If closing last tab, just reset it
            const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setTabs([{ id: newId, url: '', displayInput: '', title: 'New Tab' }]);
            return;
        }

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        // If closing active tab, switch to another
        if (id === activeTabId) {
            const index = tabs.findIndex(t => t.id === id);
            const nextTab = newTabs[index] || newTabs[index - 1] || newTabs[0];
            setActiveTabId(nextTab.id);
        }

        // Cleanup ref
        delete webviewRefs.current[id];
    };

    const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    const handleMount = useCallback((id: string, ref: any, whiteboardId: string) => {
        webviewRefs.current[`${whiteboardId}-${id}`] = ref;
    }, []);

    // Navigation
    const navigate = (overrideUrl?: string) => {
        const input = overrideUrl || activeTab.displayInput.trim();
        if (!input) return;

        // Auth Gate for search/navigation
        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
            setAuthModal(true, "Browsing and AI features require an account to save your progress and access real-time analysis.");
            return;
        }

        const target = resolveUrl(input);
        updateTab(activeTabId, { url: target });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') navigate();
    };

    const handleToggleAutoSync = () => {
        // Auth Gate
        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
            setAuthModal(true, "Auto-sync requires an account to save your browsing path and sync it across devices.");
            return;
        }

        updateBrowserState(activeWhiteboardId, {
            isAutoSyncEnabled: !state.isAutoSyncEnabled
        });
    };

    const handleManualSync = useCallback(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || !tab.url) return;

        // Auth Gate
        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
            setAuthModal(true, "Syncing and processing web content requires an active account.");
            return;
        }

        const url = tab.url;
        const title = tab.title || (url.startsWith('http') ? new URL(url).hostname : 'New Node');
        const urlKey = normalizeUrl(url);

        const { nodes, addNode, addEdge, selectNode, updateNode } = useGraphStore.getState();

        // 1. Check existing
        const existingNode = nodes.find((n: any) => normalizeUrl(n.data?.url || '') === urlKey);
        if (existingNode) {
            updateTab(tab.id, { lastNodeId: existingNode.id });
            selectNode(existingNode.id);
            return;
        }

        // 2. Create new
        const nodeType = detectNodeType(url);
        const nodeId = `node-${Date.now()}`;

        let position = { x: 100 + (nodes.length % 4) * 280, y: 100 + Math.floor(nodes.length / 4) * 220 };
        const parentNode = tab.lastNodeId ? nodes.find(n => n.id === tab.lastNodeId) : null;
        if (parentNode) {
            position = { x: parentNode.position.x + 40, y: parentNode.position.y + 200 };
        }

        const nodeData = {
            title,
            url,
            whiteboard_id: activeWhiteboardId
        };

        addNode({
            id: nodeId,
            type: nodeType,
            position,
            style: { width: 320 },
            data: nodeData,
        });

        selectNode(nodeId);

        // 3. Process URL
        import('@/lib/api').then(({ nodesApi }) => {
            nodesApi.processUrl(url, activeWhiteboardId, nodeId).then(result => {
                const { updateNodeAndPersist } = useGraphStore.getState();
                updateNodeAndPersist(nodeId, {
                    data: {
                        title: result.title,
                        snippet: result.snippet,
                        favicon: result.metadata?.favicon,
                        outline: result.outline
                    }
                });
            });
        });

        // 4. Link
        if (tab.lastNodeId && tab.lastNodeId !== nodeId) {
            addEdge({
                id: `e-${tab.lastNodeId}-${nodeId}`,
                source: tab.lastNodeId,
                sourceHandle: 'bottom',
                target: nodeId,
                targetHandle: 'top',
                animated: true,
            });
        }

        // 5. Update trace
        updateTab(tab.id, { lastNodeId: nodeId });

    }, [tabs, activeTabId, activeWhiteboardId, updateTab]);

    const activeTabWebviewKey = `${activeWhiteboardId}-${activeTabId}`;
    const activeWebview = webviewRefs.current[activeTabWebviewKey];

    return (
        <div className="flex flex-col h-full bg-neutral-950">
            {/* Tab Bar */}
            <div className="flex items-center pt-2 px-2 gap-1 bg-neutral-950 border-b border-neutral-800 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] rounded-t-lg text-xs cursor-pointer select-none transition-colors relative
                            ${tab.id === activeTabId
                                ? 'bg-neutral-900 text-white border-x border-t border-neutral-800'
                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
                            }
                        `}
                    >
                        {/* Status/Icon */}
                        {tab.isLoading ? (
                            <Loader2 size={12} className="animate-spin text-purple-500 shrink-0" />
                        ) : (
                            <Globe size={12} className={tab.id === activeTabId ? "text-purple-400" : "opacity-50"} />
                        )}

                        <span className="truncate flex-1 font-medium">
                            {tab.title || (tab.url ? 'Loading...' : 'New Tab')}
                        </span>

                        <button
                            onClick={(e) => closeTab(tab.id, e)}
                            className={`p-0.5 rounded-md hover:bg-neutral-800 ${tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={() => addTab()}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Navigation Bar */}
            <div className="h-12 border-b border-neutral-800 flex items-center px-3 gap-2 bg-neutral-900 shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => activeWebview?.goBack()}
                        disabled={!activeTab.url || !activeTab.canGoBack}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => activeWebview?.goForward()}
                        disabled={!activeTab.url || !activeTab.canGoForward}
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        onClick={() => {
                            if (activeTab.url) activeWebview?.reload();
                            else updateTab(activeTabId, { url: '' });
                        }}
                    >
                        <RotateCw size={16} className={activeTab.isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* URL Bar */}
                <div className="flex-1 flex items-center bg-neutral-800/50 border border-neutral-700 rounded-xl px-3 py-1.5 focus-within:border-purple-500 focus-within:bg-neutral-800 transition-all">
                    <Globe size={14} className="text-neutral-500 mr-2 shrink-0" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 placeholder-neutral-500"
                        value={activeTab.displayInput}
                        onChange={(e) => updateTab(activeTabId, { displayInput: e.target.value })}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or enter URL..."
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pr-1">
                    <div className="flex items-center gap-2 bg-neutral-800/50 px-2 py-1 rounded-lg border border-neutral-700">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Auto-Sync</span>
                        <button
                            onClick={handleToggleAutoSync}
                            className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${state.isAutoSyncEnabled ? 'bg-purple-500' : 'bg-neutral-700'}`}
                        >
                            <div className={`absolute w-3.5 h-3.5 bg-white rounded-full transition-all ${state.isAutoSyncEnabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {mountedWhiteboardIds.map(wbId => {
                    const wbState = browserStates[wbId] || (wbId === activeWhiteboardId ? state : null);
                    if (!wbState) return null;

                    return (wbState.tabs || []).map(tab => (
                        <BrowserTab
                            key={`${wbId}-${tab.id}`}
                            tab={tab}
                            isActive={wbId === activeWhiteboardId && tab.id === (wbId === activeWhiteboardId ? activeTabId : wbState.activeTabId)}
                            onUpdate={wbId === activeWhiteboardId ? updateTab : (id, updates) => {
                                // Background update for non-active whiteboard tabs (e.g. title changes)
                                updateBrowserState(wbId, {
                                    tabs: wbState.tabs.map(t => t.id === id ? { ...t, ...updates } : t)
                                });
                            }}
                            onMount={(id, ref) => handleMount(id, ref, wbId)}
                            onNewTab={wbId === activeWhiteboardId ? addTab : () => { }} // Only allow new tabs on active board
                            activeWhiteboardId={wbId}
                        />
                    ));
                })}
            </div>
        </div>
    );
}
