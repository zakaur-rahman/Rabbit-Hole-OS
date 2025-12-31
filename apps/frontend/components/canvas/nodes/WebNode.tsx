'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { NodeProps } from 'reactflow';
import { Globe, ExternalLink, RefreshCw, Maximize2, X } from 'lucide-react';
import BaseNode from './BaseNode';

export interface WebNodeData {
    url: string;
    title?: string;
    favicon?: string;
    color?: string;
}

function WebNode({ data, selected, id }: NodeProps<WebNodeData>) {
    const [isLoading, setIsLoading] = useState(true);
    const [iframeKey, setIframeKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const webviewRef = useRef<any>(null);

    // Check if running in Electron (webview is available)
    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const checkElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
        setIsElectron(checkElectron);
        console.log('[WebNode] Environment check:', { isElectron: checkElectron, userAgent: navigator.userAgent });
    }, []);

    // Extract domain for display
    let domain = 'Web Page';
    try {
        if (data.url) {
            domain = new URL(data.url).hostname.replace('www.', '');
        }
    } catch { }

    const handleRefresh = useCallback(() => {
        setIsLoading(true);
        if (webviewRef.current?.reload) {
            webviewRef.current.reload();
        } else {
            setIframeKey(prev => prev + 1);
        }
    }, []);

    const handleOpenExternal = useCallback(() => {
        if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
        }
    }, [data.url]);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // Webview event handlers
    useEffect(() => {
        if (!isMounted || !isElectron) return;

        const webview = webviewRef.current;
        if (!webview) return;

        const handleDomReady = () => {
            // Inject custom scrollbar CSS
            webview.insertCSS(`
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #171717;
                }
                ::-webkit-scrollbar-thumb {
                    background: #404040;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #525252;
                }
            `);
        };

        const handleDidStartLoading = () => setIsLoading(true);
        const handleDidStopLoading = () => setIsLoading(false);
        const handleDidFailLoad = (e: any) => {
            if (e.errorCode && e.errorCode !== -3) {
                console.error(`WebNode: Load failed (${e.errorCode}): ${e.errorDescription}`);
            }
            setIsLoading(false);
        };

        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-fail-load', handleDidFailLoad);

        return () => {
            webview.removeEventListener('dom-ready', handleDomReady);
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
            webview.removeEventListener('did-fail-load', handleDidFailLoad);
        };
    }, [isMounted, isElectron, data.url]);

    return (
        <>
            <BaseNode
                id={id}
                selected={selected}
                title={data.title || domain}
                subtitle={domain}
                icon={data.favicon || Globe}
                accentColor={data.color || 'purple-500'}
                minWidth={400}
                minHeight={350}
                showResizer={true}
            >
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/50">
                        <span className="text-[11px] text-neutral-400 truncate max-w-[250px]" title={data.url}>
                            {data.url}
                        </span>
                        <div className="flex items-center gap-1 nodrag">
                            <button
                                onClick={handleRefresh}
                                className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                            {/* <button
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                                title="Fullscreen"
                            >
                                <Maximize2 size={12} />
                            </button> */}
                            <button
                                onClick={handleOpenExternal}
                                className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                                title="Open in browser"
                            >
                                <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative bg-white overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
                                <div className="flex flex-col items-center gap-3 text-neutral-400">
                                    <RefreshCw size={24} className="animate-spin text-purple-500" />
                                    <span className="text-xs">Loading page...</span>
                                </div>
                            </div>
                        )}

                        {isFullscreen ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-500">
                                <div className="flex flex-col items-center gap-2">
                                    <Maximize2 size={24} />
                                    <span className="text-sm">Viewing in Fullscreen</span>
                                </div>
                            </div>
                        ) : (
                            isMounted && (
                                isElectron ? (
                                    // Use Electron webview - can load ANY site
                                    <webview
                                        ref={webviewRef}
                                        src={data.url}
                                        className="w-full h-full nodrag"
                                        // @ts-ignore
                                        allowpopups="true"
                                        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                                    />
                                ) : (
                                    // Fallback to iframe for non-Electron environments
                                    <iframe
                                        key={iframeKey}
                                        src={data.url}
                                        className="w-full h-full border-0 nodrag"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        onLoad={() => setIsLoading(false)}
                                        onError={() => setIsLoading(false)}
                                        title={data.title || domain}
                                    />
                                )
                            )
                        )}
                    </div>
                </div>
            </BaseNode>

            {/* Fullscreen overlay */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-black/90 overflow-hidden rounded-2xl flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                            <Globe size={18} className="text-purple-500" />
                            <span className="text-sm text-white font-medium">{data.title || domain}</span>
                            <span className="text-xs text-neutral-500">{data.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                className="p-2 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                            >
                                <RefreshCw size={16} />
                            </button>
                            <button
                                onClick={handleOpenExternal}
                                className="p-2 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                            >
                                <ExternalLink size={16} />
                            </button>
                            {/* <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button> */}
                        </div>
                    </div>
                    {isMounted && (
                        isElectron ? (
                            <webview
                                ref={webviewRef}
                                src={data.url}
                                className="flex-1 w-full"
                                // @ts-ignore
                                allowpopups="true"
                                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            />
                        ) : (
                            <iframe
                                key={iframeKey + 1000}
                                src={data.url}
                                className="flex-1 w-full border-0"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                title={data.title || domain}
                            />
                        )
                    )}
                </div>
            )}
        </>
    );
}

export default memo(WebNode);
