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
    /** Must include the whiteboardId so the parent stores refs under the correct composite key. */
    onMount: (id: string, ref: any, whiteboardId: string) => void;
    onNewTab: (url: string, parentId?: string) => void;
    activeWhiteboardId: string;
}

const BrowserTab = memo(({ tab, isActive, onUpdate, onMount, onNewTab, activeWhiteboardId }: BrowserTabProps) => {
    const webviewRef = useRef<any>(null);

    // Auto-add helper refs
    const processedUrlsRef = useRef<Set<string>>(new Set());
    const currentTitleRef = useRef(tab.title);
    const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Mirror lastNodeId into a ref so autoAddNodeToGraph always gets the
    // latest value even when the useCallback closure is stale.
    const lastNodeIdRef = useRef(tab.lastNodeId);

    // Forward webview ref to parent once it's available
    useEffect(() => {
        if (webviewRef.current) {
            onMount(tab.id, webviewRef.current, activeWhiteboardId);
        }
    });

    useEffect(() => {
        currentTitleRef.current = tab.title;
    }, [tab.title]);

    useEffect(() => {
        lastNodeIdRef.current = tab.lastNodeId;
    }, [tab.lastNodeId]);



    // Auto add node logic
    // Note: reads lastNodeIdRef.current (not tab.lastNodeId from closure) so that
    // rapid navigations always use the freshest parent pointer.
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
            lastNodeIdRef.current = existingNode.id;
            onUpdate(tab.id, { lastNodeId: existingNode.id });
            useGraphStore.getState().selectNode(existingNode.id);
            processedUrlsRef.current.add(urlKey);
            return;
        }

        processedUrlsRef.current.add(urlKey);

        const nodeType = detectNodeType(url);
        const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Use freshest lastNodeId from ref (not stale closure)
        const lastNodeId = lastNodeIdRef.current;

        // Smart Positioning: Place relative to parent if it exists
        let position = { x: 100 + (nodes.length % 4) * 280, y: 100 + Math.floor(nodes.length / 4) * 220 };
        const parentNode = lastNodeId ? nodes.find(n => n.id === lastNodeId) : null;

        if (parentNode) {
            position = {
                x: parentNode.position.x + (Math.random() * 40 - 20),
                y: parentNode.position.y + 200,
            };
        }

        const nodeData: any = {
            title: title || new URL(url).hostname,
            url,
            whiteboard_id: activeWhiteboardId,
        };

        addNode({
            id: nodeId,
            type: nodeType,
            position,
            style: { width: 320 },
            data: nodeData,
        });

        // Immediately update ref so the next navigation in this tab uses this node as parent
        lastNodeIdRef.current = nodeId;

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
                        outline: result.outline,
                    }
                });
            }).catch(console.error);
        });

        // Link to parent if trace exists
        if (lastNodeId && lastNodeId !== nodeId) {
            console.log('[Browser] Creating edge:', lastNodeId, '->', nodeId);
            addEdge({
                id: `e-${lastNodeId}-${nodeId}`,
                source: lastNodeId,
                sourceHandle: 'bottom-source',
                target: nodeId,
                targetHandle: 'top-target',
                animated: true,
            });
        } else {
            console.log('[Browser] NOT creating edge. Missing lastNodeId or self-loop.');
        }

        // Update tab's trace pointer in store state
        onUpdate(tab.id, { lastNodeId: nodeId });
    }, [activeWhiteboardId, tab.id, onUpdate]);

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

            // Only auto-add a node for the very first navigation in this tab
            // (i.e. the initial page load). All subsequent link clicks open new tabs
            // via the JS interceptor / new-window handler, so their own BrowserTab
            // instances handle node creation independently.
            if (url.startsWith('http') && processedUrlsRef.current.size === 0) {
                if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);

                navigationTimeoutRef.current = setTimeout(() => {
                    autoAddNodeToGraph(url, currentTitleRef.current || url);
                }, 800);
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

            // ── Link intercept: open ALL anchor clicks in a new internal tab ──
            // Uses event delegation so it works with dynamically-added content (SPAs).
            // We capture the click, prevent default, and signal the host via console.log.
            // The webview's `console-message` event picks up our prefixed message.
            // We can't use window.open() because Electron blocks it without allowpopups.
            webview.executeJavaScript(`
                (function() {
                    if (window.__cognode_link_interceptor__) return;
                    window.__cognode_link_interceptor__ = true;

                    document.addEventListener('click', function(e) {
                        var el = e.target;
                        while (el && el.tagName !== 'A') el = el.parentElement;
                        if (!el) return;

                        var href = el.getAttribute('href');
                        if (!href) return;
                        if (href.startsWith('#') || href.startsWith('javascript:') ||
                            href.startsWith('mailto:') || href.startsWith('tel:')) return;

                        var absoluteUrl;
                        try { absoluteUrl = new URL(href, window.location.href).href; }
                        catch(ex) { return; }

                        if (!absoluteUrl.startsWith('http')) return;

                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.log('__COGNODE_NAV__:' + absoluteUrl);
                    }, true);
                })();
            `).catch(() => {/* webview not ready */ });
        };

        // ── console-message: picks up our __COGNODE_NAV__ signals from the injected interceptor ──
        const handleConsoleMessage = (e: any) => {
            const msg = e.message;
            if (typeof msg === 'string' && msg.startsWith('__COGNODE_NAV__:')) {
                const url = msg.slice('__COGNODE_NAV__:'.length);
                if (url.startsWith('http')) {
                    onNewTab(url, lastNodeIdRef.current);
                }
            }
        };

        // ── new-window: fallback for target="_blank" and window.open() from page JS ──
        const handleNewWindow = (e: any) => {
            if (e.url && e.url.startsWith('http')) {
                onNewTab(e.url, lastNodeIdRef.current);
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleNavigation);
        webview.addEventListener('did-navigate-in-page', handleNavigation);
        webview.addEventListener('console-message', handleConsoleMessage);
        webview.addEventListener('new-window', handleNewWindow);
        webview.addEventListener('page-title-updated', handleTitleUpdate);
        webview.addEventListener('dom-ready', handleDomReady);

        return () => {
            if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
            webview.removeEventListener('did-navigate', handleNavigation);
            webview.removeEventListener('did-navigate-in-page', handleNavigation);
            webview.removeEventListener('console-message', handleConsoleMessage);
            webview.removeEventListener('new-window', handleNewWindow);
            webview.removeEventListener('page-title-updated', handleTitleUpdate);
            webview.removeEventListener('dom-ready', handleDomReady);
        };
    }, [tab.id, tab.url, onUpdate, autoAddNodeToGraph, onNewTab]);

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
            <webview
                ref={webviewRef}
                src={tab.url}
                className="w-full h-full"
                // @ts-ignore
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
        </div>
    );
});
BrowserTab.displayName = 'BrowserTab';


// --- Main BrowserView Component ---
export default function BrowserView() {
    const { activeWhiteboardId, browserStates, updateBrowserState, addNode, selectedNodeId, nodeClickTs, nodes, setAuthModal } = useGraphStore();

    // Track which whiteboards have their tabs mounted in DOM.
    // Capped at 5 to prevent unbounded memory growth from accumulated webviews.
    const [mountedWhiteboardIds, setMountedWhiteboardIds] = useState<string[]>([activeWhiteboardId]);

    useEffect(() => {
        if (!mountedWhiteboardIds.includes(activeWhiteboardId)) {
            setMountedWhiteboardIds(prev => {
                const next = [...prev, activeWhiteboardId];
                // Keep the active + last 4 — evict oldest background whiteboards
                if (next.length > 5) return next.slice(next.length - 5);
                return next;
            });
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
            // If closing last tab, reset to a fresh blank tab
            const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setTabs([{ id: newId, url: '', displayInput: '', title: 'New Tab' }]);
            setActiveTabId(newId); // ← was missing: keeps isActive in sync
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

        // Cleanup ref — must use composite key to match how handleMount stores it
        delete webviewRefs.current[`${activeWhiteboardId}-${id}`];
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
            }).catch(err => console.error('[Browser] Manual sync processUrl failed:', err));
        });

        // 4. Link
        if (tab.lastNodeId && tab.lastNodeId !== nodeId) {
            addEdge({
                id: `e-${tab.lastNodeId}-${nodeId}`,
                source: tab.lastNodeId,
                sourceHandle: 'bottom-source',
                target: nodeId,
                targetHandle: 'top-target',
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
            <div className="flex-1 relative bg-neutral-950 overflow-hidden">
                {mountedWhiteboardIds.map(wbId => {
                    const wbState = browserStates[wbId] || (wbId === activeWhiteboardId ? state : null);
                    if (!wbState) return null;

                    // For the active whiteboard, use local `tabs` state (always fresh).
                    // For background whiteboards, read from store.
                    const renderedTabs = wbId === activeWhiteboardId ? tabs : (wbState.tabs || []);
                    const renderedActiveTabId = wbId === activeWhiteboardId ? activeTabId : wbState.activeTabId;

                    return renderedTabs.map(tab => (
                        <BrowserTab
                            key={`${wbId}-${tab.id}`}
                            tab={tab}
                            isActive={wbId === activeWhiteboardId && tab.id === renderedActiveTabId}
                            onUpdate={wbId === activeWhiteboardId ? updateTab : (id, updates) => {
                                updateBrowserState(wbId, {
                                    tabs: wbState.tabs.map(t => t.id === id ? { ...t, ...updates } : t)
                                });
                            }}
                            onMount={(id, ref) => handleMount(id, ref, wbId)}
                            onNewTab={wbId === activeWhiteboardId ? addTab : () => { }}
                            activeWhiteboardId={wbId}
                        />
                    ));
                })}
            </div>
        </div>
    );
}
