'use client';

import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe, Plus, X, Loader2 } from 'lucide-react';
import { useGraphStore, Tab } from '@/store/graph.store';
import { AnyNodeData } from '@/types/nodes';
import NewTabPage from './NewTabPage';
import { resolveUrl, extractSearchQuery, normalizeUrl, detectNodeType } from '@/lib/browser-utils';

// URL pattern detectors for smart node typing moved to browser-utils.ts

// Electron Webview Interface
interface WebviewElement extends HTMLWebViewElement {
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    insertCSS: (css: string) => Promise<string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executeJavaScript: (js: string) => Promise<any>;
}

// --- Browser Tab Component ---
interface BrowserTabProps {
    tab: Tab;
    isActive: boolean;
    onUpdate: (id: string, updates: Partial<Tab>) => void;
    /** Must include the whiteboardId so the parent stores refs under the correct composite key. */
    onMount: (id: string, ref: WebviewElement, whiteboardId: string) => void;
    onNewTab: (url: string, parentId?: string) => void;
    activeWhiteboardId: string;
}

const BrowserTab = memo(({ tab, isActive, onUpdate, onMount, onNewTab, activeWhiteboardId }: BrowserTabProps) => {
    const webviewRef = useRef<WebviewElement>(null);

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
        const browserState = useGraphStore.getState().browserStates[activeWhiteboardId] || { isAutoSyncEnabled: false };

        // Auth gate — if user isn't logged in, force auto-sync off and bail
        const hasAuth = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
        if (!hasAuth) {
            if (browserState.isAutoSyncEnabled) {
                useGraphStore.getState().updateBrowserState(activeWhiteboardId, { isAutoSyncEnabled: false });
            }
            return;
        }

        // Block if auto-sync is off
        if (!browserState.isAutoSyncEnabled) return;

        // Skip search engine result pages — only destination pages get nodes
        const isSearchEngine = /\b(google|bing|duckduckgo|yahoo|baidu|yandex)\.\w+\/(search|results)/i.test(url);
        if (isSearchEngine) return;

        const urlKey = normalizeUrl(url);

        // Skip if we've already processed this URL in this tab's session (e.g., back/forward navigation)
        if (processedUrlsRef.current.has(urlKey)) {
            console.log('[Browser] Skipping already-processed URL:', urlKey);
            return;
        }

        const { nodes, addNode, addEdge } = useGraphStore.getState();

        // If URL already exists in graph, just update the tab's trace pointer and return
        const existingNode = nodes.find((n) => normalizeUrl(n.data?.url || '') === urlKey);
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

        const nodeData: AnyNodeData = {
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
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const webview = webviewRef.current as any;
        if (!webview) return;

        const handleDidStartLoading = () => onUpdate(tab.id, { isLoading: true });
        const handleDidStopLoading = () => onUpdate(tab.id, { isLoading: false });

        const handleNavigation = (e: { url: string }) => {
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

        const handleTitleUpdate = (e: { title: string }) => {
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
        const handleConsoleMessage = (e: { message: string }) => {
            const msg = e.message;
            if (typeof msg === 'string' && msg.startsWith('__COGNODE_NAV__:')) {
                const url = msg.slice('__COGNODE_NAV__:'.length);
                if (url.startsWith('http')) {
                    onNewTab(url, lastNodeIdRef.current);
                }
            }
        };

        // ── new-window: fallback for target="_blank" and window.open() from page JS ──
        const handleNewWindow = (e: { url: string }) => {
            if (e.url && e.url.startsWith('http')) {
                onNewTab(e.url, lastNodeIdRef.current);
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webview.addEventListener('did-navigate', handleNavigation as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webview.addEventListener('did-navigate-in-page', handleNavigation as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webview.addEventListener('console-message', handleConsoleMessage as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webview.addEventListener('new-window', handleNewWindow as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webview.addEventListener('page-title-updated', handleTitleUpdate as any);
        webview.addEventListener('dom-ready', handleDomReady);

        return () => {
            if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webview.removeEventListener('did-navigate', handleNavigation as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webview.removeEventListener('did-navigate-in-page', handleNavigation as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webview.removeEventListener('console-message', handleConsoleMessage as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webview.removeEventListener('new-window', handleNewWindow as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webview.removeEventListener('page-title-updated', handleTitleUpdate as any);
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
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
        </div>
    );
});
BrowserTab.displayName = 'BrowserTab';


// --- Main BrowserView Component ---
export default function BrowserView() {
    const { activeWhiteboardId, browserStates, updateBrowserState, selectedNodeId, nodeClickTs, setAuthModal } = useGraphStore();

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
    const webviewRefs = useRef<{ [key: string]: WebviewElement }>({});
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNodeId, nodeClickTs, addTab]); // nodeClickTs fires even when same node re-clicked

    // --- Browser -> Graph Sync ---
    // When active tab changes, select the corresponding node in the graph
    useEffect(() => {
        if (!activeTab || !activeTab.url) return;

        const { nodes, selectNode, selectedNodeId } = useGraphStore.getState();
        const urlKey = normalizeUrl(activeTab.url);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingNode = (nodes as any[]).find((n: any) => normalizeUrl((n.data as any)?.url || '') === urlKey);

        // Only update if different to avoid loops/jitters
        if (existingNode && existingNode.id !== selectedNodeId) {
            selectNode(existingNode.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleMount = useCallback((id: string, ref: WebviewElement, whiteboardId: string) => {
        webviewRefs.current[`${whiteboardId}-${id}`] = ref;
    }, []);

    // Navigation
    const navigate = (overrideUrl?: string) => {
        const input = overrideUrl || activeTab.displayInput.trim();
        if (!input) return;

        // Auth Gate for search/navigation
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
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
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setAuthModal(true, "Auto-sync requires an account to save your browsing path and sync it across devices.");
            return;
        }

        updateBrowserState(activeWhiteboardId, {
            isAutoSyncEnabled: !state.isAutoSyncEnabled
        });
    };

    const _handleManualSync = useCallback(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || !tab.url) return;

        // Auth Gate
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setAuthModal(true, "Syncing and processing web content requires an active account.");
            return;
        }

        const url = tab.url;
        const title = tab.title || (url.startsWith('http') ? new URL(url).hostname : 'New Node');

        const { nodes, addNode, addEdge, selectNode, updateNode: _updateNode } = useGraphStore.getState();
        const urlKey = normalizeUrl(tab.url);

        // 1. Check existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingNode = (nodes as any[]).find((n: any) => normalizeUrl((n.data as any)?.url || '') === urlKey);
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

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabs, activeTabId, activeWhiteboardId, updateTab]);

    const activeTabWebviewKey = `${activeWhiteboardId}-${activeTabId}`;
    const activeWebview = webviewRefs.current[activeTabWebviewKey];

    return (
        <div className="flex flex-col h-full bg-(--bg) border-r border-(--border) overflow-hidden">
            {/* Tab Bar */}
            <div className="h-[36px] bg-(--surface) border-b border-(--border) flex items-center px-3 gap-[6px] overflow-x-auto no-scrollbar shrink-0 z-50">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            h-[26px] px-3.5 border border-b-0 rounded-t-[5px] font-sans text-[11px] font-medium cursor-pointer whitespace-nowrap flex items-center gap-2 max-w-[160px] overflow-hidden transition-all group select-none relative top-[5px]
                            ${tab.id === activeTabId
                                ? 'bg-(--bg) border-(--border2) text-(--text)'
                                : 'bg-(--raised) border-(--border) text-(--sub) hover:text-(--text)'
                            }
                        `}
                    >
                        {tab.isLoading ? (
                            <Loader2 size={11} className="animate-spin text-(--amber) shrink-0" />
                        ) : null}

                        <span className="truncate flex-1">
                            {tab.title || (tab.url ? 'Loading...' : 'New Tab')}
                        </span>

                        <button
                            onClick={(e) => closeTab(tab.id, e)}
                            className={`ml-1 border-none bg-transparent hover:text-(--red) transition-all ${tab.id === activeTabId ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100'} text-(--sub) text-[13px]`}
                        >
                            <X size={11} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={() => addTab()}
                    className="h-[24px] w-[24px] relative top-[5px] border border-dashed border-(--border2) rounded-[5px] bg-transparent text-(--muted) cursor-pointer grid place-items-center text-[15px] shrink-0 transition-all hover:border-(--amber) hover:text-(--amber)"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Navigation Bar (Toolbar) */}
            <div className="h-[40px] bg-(--bg) border-b border-(--border) flex items-center px-3 gap-2 shrink-0 relative z-40">
                <div className="flex gap-[3px]">
                    <button
                        className="w-6 h-6 border-none bg-transparent text-(--sub) cursor-pointer rounded-[3px] grid place-items-center transition-all hover:bg-(--raised) hover:text-(--text) disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => activeWebview?.goBack()}
                        disabled={!activeTab.url || !activeTab.canGoBack}
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <button
                        className="w-6 h-6 border-none bg-transparent text-(--sub) cursor-pointer rounded-[3px] grid place-items-center transition-all hover:bg-(--raised) hover:text-(--text) disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => activeWebview?.goForward()}
                        disabled={!activeTab.url || !activeTab.canGoForward}
                    >
                        <ArrowRight size={14} />
                    </button>
                    <button
                        className="w-6 h-6 border-none bg-transparent text-(--sub) cursor-pointer rounded-[3px] grid place-items-center transition-all hover:bg-(--raised) hover:text-(--text)"
                        onClick={() => {
                            if (activeTab.url) activeWebview?.reload();
                            else updateTab(activeTabId, { url: '' });
                        }}
                    >
                        <RotateCw size={14} className={activeTab.isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="flex-1 bg-(--raised) border border-(--border) rounded-(--r) h-[26px] flex items-center px-2.5 gap-1.5 focus-within:border-(--border2) transition-colors">
                    <Globe size={11} className="text-(--sub) shrink-0" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none font-mono text-[10px] text-(--sub) placeholder:text-(--muted)"
                        value={activeTab.displayInput}
                        onChange={(e) => updateTab(activeTabId, { displayInput: e.target.value })}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or enter URL..."
                    />
                </div>

                <div 
                    onClick={handleToggleAutoSync}
                    className="flex items-center gap-[5px] bg-(--amber-bg) border border-[rgba(232,160,32,0.2)] rounded-(--r) px-2.5 py-[3px] text-[10px] font-semibold text-(--amber) tracking-[0.05em] cursor-pointer select-none transition-colors hover:bg-[rgba(232,160,32,0.12)]"
                    style={{ opacity: state.isAutoSyncEnabled ? 1 : 0.5 }}
                >
                    <div className={`w-[5px] h-[5px] rounded-full bg-(--amber) ${state.isAutoSyncEnabled ? 'animate-pulse' : ''}`}></div>
                    AUTO-SYNC
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {mountedWhiteboardIds.map(wbId => {
                    const wbState = browserStates[wbId] || (wbId === activeWhiteboardId ? state : null);
                    if (!wbState) return null;

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
