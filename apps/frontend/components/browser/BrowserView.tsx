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
        const urlKey = normalizeUrl(url);
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

        import('@/lib/api').then(({ nodesApi }) => {
            nodesApi.processUrl(url, activeWhiteboardId, nodeId).then(result => {
                useGraphStore.getState().updateNode(nodeId, {
                    title: result.title,
                    snippet: result.snippet,
                    favicon: result.metadata?.favicon,
                    outline: result.outline
                });
            }).catch(console.error);
        });

        // Link to parent if trace exists
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

            onUpdate(tab.id, { url, displayInput });

            if (url.startsWith('http')) {
                const isSearchPage = url.includes('google.com/search') || url.includes('bing.com/search');
                if (!isSearchPage) {
                    // clear any pending node creation from rapid redirects
                    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);

                    navigationTimeoutRef.current = setTimeout(() => {
                        autoAddNodeToGraph(url, currentTitleRef.current || url);
                    }, 800); // Increased delay to 800ms to catch final redirect
                } else {
                    // For search pages, we don't create a node, but we MIGHT want to clear the lastNodeId
                    // if we want to start a new chain? OR we keep it so the next result links to the previous context?
                    // User said: "Tab A: India (root node) -> Open Delhi (child)"
                    // If I search for "Delhi" in Tab A, it assumes I'm still in "India" context?
                    // Let's NOT update lastNodeId for search pages, so the link jumps over the search step.
                }
            }
        };

        const handleTitleUpdate = (e: any) => {
            onUpdate(tab.id, { title: e.title });

            // Sync title to graph node
            const { nodes, updateNode } = useGraphStore.getState();
            const targetNode = nodes.find(n => normalizeUrl(n.data?.url || '') === normalizeUrl(tab.url || ''));
            if (targetNode) {
                updateNode(targetNode.id, { title: e.title });
            }
        };

        const handleDomReady = () => {
            // Inject scrollbar CSS
            webview.insertCSS(`
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #171717; }
                ::-webkit-scrollbar-thumb { background: #404040; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #525252; }
            `);
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
    const { activeWhiteboardId, browserStates, updateBrowserState, addNode, selectedNodeId, nodes } = useGraphStore();

    // Load state from store or defaults
    const state = browserStates[activeWhiteboardId] || {
        url: '', displayInput: '', tabs: [{ id: '1', url: '', displayInput: '', title: 'New Tab' }], activeTabId: '1'
    };

    // We use local state for immediate UI updates, sync DB in background
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

    // Sync to store when local state changes
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        // Debounce or just check validity?
        // We'll trust the lock for now.
        updateBrowserState(activeWhiteboardId, {
            tabs,
            activeTabId,
            url: tabs.find(t => t.id === activeTabId)?.url || '',
            displayInput: tabs.find(t => t.id === activeTabId)?.displayInput || ''
        });
    }, [tabs, activeTabId, activeWhiteboardId, updateBrowserState]);


    // Tab Management
    const addTab = useCallback((initialUrl: string = '', parentId?: string, title?: string) => {
        const newId = Date.now().toString();
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

    }, [selectedNodeId, addTab]); // ONLY run when selection changes. NOT when nodes change.

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
            setTabs([{ id: Date.now().toString(), url: '', displayInput: '', title: 'New Tab' }]);
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

    const handleMount = useCallback((id: string, ref: any) => {
        webviewRefs.current[id] = ref;
    }, []);

    // Navigation
    const navigate = (overrideUrl?: string) => {
        const input = overrideUrl || activeTab.displayInput.trim();
        if (!input) return;

        const target = resolveUrl(input);
        updateTab(activeTabId, { url: target });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') navigate();
    };

    const handleManualSync = useCallback(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || !tab.url) return;

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
                updateNode(nodeId, {
                    title: result.title,
                    snippet: result.snippet,
                    favicon: result.metadata?.favicon,
                    outline: result.outline
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

    const activeWebview = webviewRefs.current[activeTabId];

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
                        disabled={!activeTab.url || !activeWebview?.canGoBack?.()}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => activeWebview?.goForward()}
                        disabled={!activeTab.url || !activeWebview?.canGoForward?.()}
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
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleManualSync}
                        disabled={!activeTab.url}
                        className={`h-8 px-3 flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/20 ${!activeTab.url ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <RefreshCw size={14} />
                        <span className="hidden sm:inline">Sync</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {tabs.map(tab => (
                    <BrowserTab
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onUpdate={updateTab}
                        onMount={handleMount}
                        onNewTab={addTab}
                        activeWhiteboardId={activeWhiteboardId}
                    />
                ))}
            </div>
        </div>
    );
}
