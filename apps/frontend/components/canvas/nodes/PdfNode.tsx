import React, { memo, useState, useCallback, useRef } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import BaseNode from './BaseNode';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useNodeTheme } from '@/hooks/useNodeTheme';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


export interface PdfNodeData {
    title?: string;
    url?: string;
    hasInstruction?: boolean;
}

function PdfNode({ data, selected, id }: NodeProps<PdfNodeData>) {
    const [url, setUrl] = useState(data.url || '');
    const [inputUrl, setInputUrl] = useState('');
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [scale, setScale] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const updateNode = useGraphStore(state => state.updateNode);
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 300);
    };



    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const handleUrlSubmit = useCallback(() => {
        if (inputUrl) {
            setIsLoading(true);
            setUrl(inputUrl);
            updateNode(id, { url: inputUrl });
        }
    }, [inputUrl, id, updateNode]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                setUrl(result);
                updateNode(id, { url: result });
            }
        };
        reader.readAsDataURL(file);
    }, [id, updateNode]);

    const changePage = (offset: number) => {
        setPageNumber((prevPageNumber: number) => prevPageNumber + offset);
    };

    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
        updateNodeAndPersist(id, {
            style: { width: params.width, height: params.height }
        });
    }, [id, updateNodeAndPersist]);

    // Subscribe to color from node data
    const nodeColor = useGraphStore(state => state.nodes.find(n => n.id === id)?.data?.color);
    const { theme } = useNodeTheme(nodeColor || 'red');

    return (
        <>
            <NodeResizer 
                minWidth={280} 
                minHeight={200}
                isVisible={selected}
                lineClassName="!border-[var(--node-primary)]"
                handleClassName="h-2 w-2 !bg-[#0e1012] !border !border-[var(--node-primary)] rounded-sm"
                onResizeEnd={onResizeEnd} 
            />
            <div 
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`flex flex-col relative w-full h-full min-w-[280px] bg-(--surface) rounded-[13px] overflow-hidden cursor-pointer transition-all duration-250 group ${selected ? '-translate-y-[2px]' : 'hover:-translate-y-[2px]'}`}
            style={{
                border: `1px solid ${selected ? theme.primary : theme.border}`,
                boxShadow: selected
                    ? `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 0 4px ${theme.glow}, 0 12px 48px rgba(0,0,0,0.7), 0 0 28px ${theme.glow}`
                    : `0 0 0 1px rgba(255,255,255,0.025) inset, 0 8px 40px rgba(0,0,0,0.65)`,
            }}
        >
            <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />
            {/* Connection Dots */}
            <div
                className="absolute left-1/2 -translate-x-1/2 -top-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px]"
                style={{
                    backgroundColor: selected ? theme.primary : 'var(--border2)',
                    borderColor: selected ? theme.primary : 'var(--border)',
                    boxShadow: selected ? `0 0 8px ${theme.hover}` : undefined,
                }}
            />
            <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px]"
                style={{
                    backgroundColor: selected ? theme.primary : 'var(--border2)',
                    borderColor: selected ? theme.primary : 'var(--border)',
                    boxShadow: selected ? `0 0 8px ${theme.hover}` : undefined,
                }}
            />

            {/* Hidden ReactFlow handles */}
            <div className="absolute inset-0 pointer-events-none opacity-0">
                <BaseNode id={id} selected={selected} title="Hidden" subtitle="FILE"><div/></BaseNode>
            </div>

            {/* Header */}
            <div 
                className="px-[13px] py-[12px] pb-[11px] flex items-center gap-[10px] border-b border-(--border) relative z-10"
                style={{ background: 'linear-gradient(135deg, var(--raised) 0%, rgba(22,20,18,0.5) 100%)' }}
            >
                <div
                    className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-[14px] shrink-0 border"
                    style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                    📄
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-bold text-(--text) tracking-[0.01em] mb-[2px] leading-tight">PDF Document</div>
                    <div className="font-mono text-[9px] tracking-[0.14em] uppercase leading-tight" style={{ color: theme.primary }}>FILE</div>
                </div>
                <button className="w-[22px] h-[22px] rounded-[5px] bg-transparent border border-transparent text-(--muted) flex items-center justify-center text-[14px] cursor-pointer transition-all tracking-[1px] hover:bg-(--raised) hover:border-(--border) hover:text-(--sub) leading-none pb-[6px]">
                    ...
                </button>
            </div>

            {/* Preview Area */}
            <div className={`relative overflow-hidden flex-1 flex flex-col items-center bg-[#111010] z-10 ${url ? 'min-h-[300px]' : 'min-h-[140px] justify-center'}`}>
                {!url && (
                    <div 
                        className="absolute inset-0 opacity-20" 
                        style={{
                            background: `linear-gradient(135deg, ${theme.primary} 0%, transparent 60%), repeating-linear-gradient(-45deg, transparent, transparent 12px, ${theme.primary} 12px, ${theme.primary} 13px)`,
                        }}
                    />
                )}
                
                {url ? (
                    <div className="flex flex-col h-full w-full relative z-10">
                        {/* Pagination Toolbar */}
                        <div className="flex items-center justify-between px-[13px] py-[6px] bg-(--raised) border-b border-(--border) shrink-0">
                            <span className="font-mono text-[9px] text-(--sub)">
                                Page {pageNumber} of {numPages || '--'}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setScale((s: number) => Math.max(0.5, s - 0.25))}
                                    className="p-1 text-(--sub) hover:text-(--text) cursor-pointer"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={13} />
                                </button>
                                <span className="font-mono text-[9px] text-(--sub) w-[24px] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={() => setScale((s: number) => Math.min(3, s + 0.25))}
                                    className="p-1 text-(--sub) hover:text-(--text) cursor-pointer"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={13} />
                                </button>
                                <div className="w-[1px] h-[12px] bg-(--border) mx-1" />
                                <button
                                    disabled={pageNumber <= 1}
                                    onClick={() => changePage(-1)}
                                    className="p-1 text-(--sub) hover:text-(--text) disabled:opacity-30 disabled:hover:text-(--sub) cursor-pointer"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    disabled={pageNumber >= (numPages || 1)}
                                    onClick={() => changePage(1)}
                                    className="p-1 text-(--sub) hover:text-(--text) disabled:opacity-30 disabled:hover:text-(--sub) cursor-pointer"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Content */}
                        <div 
                            className="flex-1 overflow-auto flex justify-center bg-(--bg) p-3 relative scrollbar-hide nodrag nowheel custom-scrollbar"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-(--bg)/50 z-10 backdrop-blur-sm">
                                    <Loader2 className="animate-spin" style={{ color: theme.primary }} size={20} />
                                </div>
                            )}
                            <Document
                                file={url}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={(error) => {
                                    console.error('Error loading PDF:', error);
                                    setIsLoading(false);
                                }}
                                loading={null}
                                error={
                                    <div className="flex items-center justify-center h-full text-[10px] font-mono" style={{ color: theme.primary }}>
                                        Failed to load PDF.
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={240} // Fit nicely inside 280px container
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="shadow-lg rounded overflow-hidden"
                                />
                            </Document>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] z-10">
                        <span className="text-[32px] opacity-10">📄</span>
                        <span className="font-mono text-[10px] text-(--muted) italic tracking-[0.06em]">No document loaded</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            {!url && (
                <div className="px-[13px] py-[12px] border-t border-(--border) flex flex-col gap-[8px] relative z-20 bg-(--surface)">
                    <div className="flex items-center gap-[6px]">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                            placeholder="Paste PDF URL..."
                            className="flex-1 h-[34px] bg-(--bg) border border-(--border2) rounded-[10px] px-[10px] font-mono text-[10px] text-(--sub) outline-none transition-all placeholder:text-(--muted)"
                            style={{ '--focus-color': theme.primary, caretColor: 'var(--amber)' } as React.CSSProperties}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={handleUrlSubmit}
                            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[15px] cursor-pointer shrink-0 transition-all border"
                            style={{ backgroundColor: theme.background, color: theme.primary, borderColor: theme.border }}
                        >
                            🔗
                        </button>
                    </div>

                    <div className="flex items-center gap-[10px] font-mono text-[9px] text-(--muted) tracking-[0.12em] before:content-[''] before:flex-1 before:h-px before:bg-(--border) after:content-[''] after:flex-1 after:h-px after:bg-(--border)">
                        or
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="application/pdf"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-[36px] rounded-[10px] border border-dashed border-(--border2) bg-transparent font-sans text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-[7px] transition-all tracking-[0.03em] text-(--sub)"
                    >
                        <span className="text-[14px]">↑</span> Upload PDF
                    </button>
                </div>
            )}

            {/* Footer */}
            <div
                className="px-[13px] py-[7px] border-t border-(--border) flex items-center justify-between relative z-10"
                style={{ background: 'linear-gradient(135deg, rgba(22,20,18,0.5) 0%, var(--raised) 100%)' }}
            >
                <span className="font-mono text-[9px] text-(--muted) tracking-[0.06em]">
                    {url ? (new URL(url).hostname || 'Local Document') : 'Supports PDF · up to 50MB'}
                </span>
                <div className="flex gap-[3px]">
                    <div className="w-[4px] h-[4px] rounded-full transition-colors duration-200" style={{ backgroundColor: theme.primary }} />
                    <div className="w-[4px] h-[4px] rounded-full transition-all duration-200 delay-50 opacity-60" style={{ backgroundColor: theme.primary }} />
                    <div className="w-[4px] h-[4px] rounded-full transition-all duration-200 delay-100 opacity-30" style={{ backgroundColor: theme.primary }} />
                </div>
            </div>
        </div>
        </>
    );
}

export default memo(PdfNode);
