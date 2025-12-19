'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe, Plus, BookmarkPlus, Share2, RefreshCw } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

// URL pattern detectors for smart node typing
const detectNodeType = (url: string): string => {
    const lowerUrl = url.toLowerCase();

    // Shopping sites
    if (lowerUrl.includes('amazon.') || lowerUrl.includes('ebay.') ||
        lowerUrl.includes('shop') || lowerUrl.includes('product') ||
        lowerUrl.includes('buy') || lowerUrl.includes('store')) {
        return 'product';
    }

    // Video sites
    if (lowerUrl.includes('youtube.') || lowerUrl.includes('vimeo.') ||
        lowerUrl.includes('video') || lowerUrl.includes('watch')) {
        return 'video';
    }

    // Developer/Code sites
    if (lowerUrl.includes('stackoverflow.') || lowerUrl.includes('github.') ||
        lowerUrl.includes('gitlab.') || lowerUrl.includes('docs.') ||
        lowerUrl.includes('developer.') || lowerUrl.includes('api.')) {
        return 'code';
    }

    // Academic sites
    if (lowerUrl.includes('scholar.') || lowerUrl.includes('arxiv.') ||
        lowerUrl.includes('journal') || lowerUrl.includes('research') ||
        lowerUrl.includes('academic') || lowerUrl.includes('.edu')) {
        return 'academic';
    }

    // Default to article
    return 'article';
};

import NewTabPage from './NewTabPage';

export default function BrowserView() {
    const webviewRef = useRef<any>(null);
    const [displayInput, setDisplayInput] = useState(''); // What user sees/types
    const [actualUrl, setActualUrl] = useState(''); // Real URL, empty means New Tab
    const [isLoading, setIsLoading] = useState(false);
    const [currentTitle, setCurrentTitle] = useState('');
    const { addNode, nodes, addEdge, activeWhiteboardId, browserStates, updateBrowserState } = useGraphStore();

    // Sync from store when whiteboard changes
    useEffect(() => {
        const state = browserStates[activeWhiteboardId] || { url: '', displayInput: '' };
        setActualUrl(state.url);
        setDisplayInput(state.displayInput);

        // Clear refs to ensure fresh state for the new whiteboard
        processedUrlsRef.current.clear();
        lastNodeIdRef.current = null;
        console.log(`[BrowserView] Whiteboard switched to: ${activeWhiteboardId}, cleared refs.`);
    }, [activeWhiteboardId]);

    // Update store when local state changes
    useEffect(() => {
        updateBrowserState(activeWhiteboardId, {
            url: actualUrl,
            displayInput: displayInput
        });
    }, [actualUrl, displayInput, activeWhiteboardId, updateBrowserState]);
    const lastNodeIdRef = useRef<string | null>(null);
    const processedUrlsRef = useRef<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check if input looks like a URL
    const isUrl = (input: string): boolean => {
        if (!input) return false;
        // Has protocol
        if (input.startsWith('http://') || input.startsWith('https://')) return true;
        // Has domain-like pattern (word.word)
        if (/^[\w-]+\.[a-z]{2,}/i.test(input)) return true;
        // Localhost or IP
        if (input.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(input)) return true;
        return false;
    };

    // Extract search query from Google URL
    const extractSearchQuery = (url: string): string | null => {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('google.') && parsed.pathname.includes('/search')) {
                return parsed.searchParams.get('q');
            }
            if (parsed.hostname.includes('bing.') && parsed.pathname.includes('/search')) {
                return parsed.searchParams.get('q');
            }
        } catch { }
        return null;
    };

    const navigate = (overrideUrl?: string) => {
        const input = overrideUrl || displayInput.trim();
        if (!input) return;

        let target: string;

        if (isUrl(input)) {
            // It's a URL - add protocol if missing
            target = input.startsWith('http') ? input : 'https://' + input;
        } else {
            // It's a search query - use Google
            target = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
        }

        setActualUrl(target);
        if (webviewRef.current) {
            // If already active, loadURL. If was new tab, it will mount and load src.
            // But we need to update state to trigger render.
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') navigate();
    };

    // Helper to normalize URLs for comparison (ignore trailing slash, etc)
    const normalizeUrl = (u: string) => {
        try {
            const parsed = new URL(u);
            if (parsed.pathname === '/' || parsed.pathname === '') {
                return parsed.hostname;
            }
            return parsed.hostname + parsed.pathname.replace(/\/$/, '');
        } catch {
            return u;
        }
    };

    // Smart node creation with type detection
    const autoAddNodeToGraph = (url: string, title: string, whiteboardId: string) => {
        const urlKey = normalizeUrl(url);
        // Access store directly to avoid stale closures in event listeners
        const { nodes, addNode, addEdge } = useGraphStore.getState();

        if (processedUrlsRef.current.has(urlKey)) {
            const existingNode = nodes.find((n: any) => normalizeUrl(n.data?.url || '') === urlKey);
            if (existingNode) {
                lastNodeIdRef.current = existingNode.id;
            }
            return;
        }

        const existingNode = nodes.find((n: any) => normalizeUrl(n.data?.url || '') === urlKey);
        if (existingNode) {
            processedUrlsRef.current.add(urlKey);
            lastNodeIdRef.current = existingNode.id;
            return;
        }

        processedUrlsRef.current.add(urlKey);

        const nodeType = detectNodeType(url);
        const nodeId = `node-${Date.now()}`;

        const baseX = 100 + (nodes.length % 4) * 280;
        const baseY = 100 + Math.floor(nodes.length / 4) * 220;

        let nodeData: any = {
            title: title || new URL(url).hostname,
            url: url,
        };

        switch (nodeType) {
            case 'product':
                nodeData = { ...nodeData, inStock: true, price: 'View Price' };
                break;
            case 'code':
                nodeData = { ...nodeData, source: url.includes('stackoverflow') ? 'stackoverflow' : 'github', upvotes: 0 };
                break;
            case 'academic':
                nodeData = { ...nodeData, peerReviewed: url.includes('journal'), category: 'economic' };
                break;
            case 'video':
                nodeData = { ...nodeData, duration: '--:--' };
                break;
        }

        addNode({
            id: nodeId,
            type: nodeType,
            position: { x: baseX, y: baseY },
            data: { ...nodeData, whiteboard_id: whiteboardId },
        });

        // Trigger background processing to get rich metadata/favicon
        import('@/lib/api').then(({ nodesApi }) => {
            nodesApi.processUrl(url, whiteboardId, nodeId).then(result => {
                useGraphStore.getState().updateNode(nodeId, {
                    title: result.title,
                    snippet: result.snippet,
                    favicon: result.metadata?.favicon
                });
            }).catch(console.error);
        });

        if (lastNodeIdRef.current && lastNodeIdRef.current !== nodeId) {
            addEdge({
                id: `e-${lastNodeIdRef.current}-${nodeId}`,
                source: lastNodeIdRef.current,
                sourceHandle: 'bottom',
                target: nodeId,
                targetHandle: 'top',
                animated: true,
            });
        }

        lastNodeIdRef.current = nodeId;
    };

    const manualAddToGraph = () => {
        try {
            const url = new URL(actualUrl);
            processedUrlsRef.current.delete(url.hostname + url.pathname);
            autoAddNodeToGraph(actualUrl, currentTitle, activeWhiteboardId);
        } catch { }
    };

    // Refs for accessing state in event listeners without re-binding
    const actualUrlRef = useRef(actualUrl);
    const currentTitleRef = useRef(currentTitle);

    // Keep refs in sync
    useEffect(() => {
        actualUrlRef.current = actualUrl;
    }, [actualUrl]);

    useEffect(() => {
        currentTitleRef.current = currentTitle;
    }, [currentTitle]);

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const handleDidStartLoading = () => setIsLoading(true);
        const handleDidStopLoading = () => setIsLoading(false);

        const handleDidNavigate = async (e: any) => {
            // Keep actualUrl in sync so navigation buttons work
            setActualUrl(e.url);

            // Show clean display: search query or simplified URL
            const searchQuery = extractSearchQuery(e.url);
            if (searchQuery) {
                setDisplayInput(searchQuery);
            } else {
                setDisplayInput(e.url.replace(/^https?:\/\//, ''));
            }
            if (!e.url.startsWith('http')) return;

            // Auto-add to graph (skip search result pages)
            const isSearchPage = e.url.includes('google.com/search') || e.url.includes('bing.com/search');
            if (!isSearchPage) {
                const { activeWhiteboardId } = useGraphStore.getState();
                setTimeout(() => {
                    autoAddNodeToGraph(e.url, currentTitleRef.current || e.url, activeWhiteboardId);
                }, 500);
            }
        };

        const handleTitleUpdate = (e: any) => {
            setCurrentTitle(e.title);

            // Sync title to graph node
            const { nodes, updateNode, activeWhiteboardId } = useGraphStore.getState();
            // Use ref for actualUrl to ensure we match the current page
            // (Note: actualUrl might have been updated by did-navigate already, or not yet if title updates first)
            // But checking actualUrlRef.current is safer than closure stale 'actualUrl'
            const currentUrl = actualUrlRef.current;
            const targetNode = nodes.find(n => normalizeUrl(n.data.url || '') === normalizeUrl(currentUrl));

            if (targetNode) {
                // Update local store
                updateNode(targetNode.id, { title: e.title });

                // Persist to backend
                import('@/lib/api').then(({ nodesApi }) => {
                    nodesApi.create({
                        id: targetNode.id,
                        type: targetNode.type || 'article',
                        title: e.title,
                        url: currentUrl,
                        data: {
                            ...targetNode.data,
                            title: e.title,
                            whiteboard_id: activeWhiteboardId
                        }
                    }).catch(err => console.error('Failed to update node title:', err));
                });
            }
        };

        const handleDidFailLoad = (e: any) => {
            // Ignore aborted errors (code -3) which happen on redirects or stop
            // check for errorCode existence to avoid logging empty events
            if (e.errorCode && e.errorCode !== -3) {
                console.error(`Webview failed to load (${e.errorCode}): ${e.errorDescription}`);
            }
            setIsLoading(false);
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('page-title-updated', handleTitleUpdate);
        webview.addEventListener('did-fail-load', handleDidFailLoad);

        return () => {
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
            webview.removeEventListener('did-navigate', handleDidNavigate);
            webview.removeEventListener('page-title-updated', handleTitleUpdate);
            webview.removeEventListener('did-fail-load', handleDidFailLoad);
        };
    }, [!!actualUrl]); // Only re-run if mounting/unmounting (actualUrl existence changes)

    return (
        <div className="flex flex-col h-full bg-neutral-950">
            {/* Navigation Bar */}
            <div className="h-12 border-b border-neutral-800 flex items-center px-3 gap-2 bg-neutral-900/50 shrink-0">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        onClick={() => webviewRef.current?.goBack()}
                        disabled={!actualUrl}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        onClick={() => webviewRef.current?.goForward()}
                        disabled={!actualUrl}
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        onClick={() => {
                            if (actualUrl) webviewRef.current?.reload();
                            else setActualUrl(''); // Refresh new tab
                        }}
                    >
                        <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        onClick={() => {
                            setActualUrl('');
                            setDisplayInput('');
                        }}
                        title="New Tab"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* URL Bar */}
                <div className="flex-1 flex items-center bg-neutral-800/50 border border-neutral-700 rounded-xl px-3 py-1.5 focus-within:border-green-500 focus-within:bg-neutral-800 transition-all">
                    <Globe size={14} className="text-neutral-500 mr-2 shrink-0" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 placeholder-neutral-500"
                        value={displayInput}
                        onChange={(e) => setDisplayInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or enter URL..."
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={manualAddToGraph}
                        disabled={!actualUrl}
                        className={`h-8 px-3 flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-500/20 ${!actualUrl ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <RefreshCw size={14} />
                        <span className="hidden sm:inline">Sync</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <BookmarkPlus size={16} />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <Share2 size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {!actualUrl ? (
                    <NewTabPage onNavigate={navigate} />
                ) : (
                    isMounted && (
                        <webview
                            ref={webviewRef}
                            src={actualUrl}
                            className="w-full h-full"
                            // @ts-ignore
                            allowpopups="true"
                            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        />
                    )
                )}
            </div>
        </div>
    );
}
