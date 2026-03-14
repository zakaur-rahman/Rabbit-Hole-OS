import React, { memo, useState, useCallback, useRef } from 'react';
import { NodeProps } from 'reactflow';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import BaseNode from './BaseNode';
import { useGraphStore } from '@/store/graph.store';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const updateNode = useGraphStore(state => state.updateNode);



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
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    return (
        <div 
            className={`relative w-[280px] bg-(--surface) rounded-[13px] overflow-hidden cursor-pointer transition-all duration-250 group ${selected ? 'ring-2 ring-(--red) shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_4px_rgba(212,91,91,0.08),0_12px_48px_rgba(0,0,0,0.7),0_0_28px_rgba(212,91,91,0.1)] -translate-y-[2px]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.025)_inset,0_8px_40px_rgba(0,0,0,0.65)] hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_4px_rgba(212,91,91,0.08),0_12px_48px_rgba(0,0,0,0.7),0_0_28px_rgba(212,91,91,0.1)]'}`}
            style={{ border: `1px solid ${selected ? 'var(--red)' : 'rgba(212,91,91,0.3)'}` }}
        >
            {/* Connection Dots */}
            <div className={`absolute left-1/2 -translate-x-1/2 -top-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px] ${selected ? 'bg-(--red) border-(--red) shadow-[0_0_8px_rgba(212,91,91,0.5)]' : 'bg-(--border2) border-(--border) group-hover:bg-(--red) group-hover:border-(--red) group-hover:shadow-[0_0_8px_rgba(212,91,91,0.5)]'}`} />
            <div className={`absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-[8px] h-[8px] rounded-full z-10 transition-all duration-200 border-[1.5px] ${selected ? 'bg-(--red) border-(--red) shadow-[0_0_8px_rgba(212,91,91,0.5)]' : 'bg-(--border2) border-(--border) group-hover:bg-(--red) group-hover:border-(--red) group-hover:shadow-[0_0_8px_rgba(212,91,91,0.5)]'}`} />

            {/* Hidden ReactFlow handles */}
            <div className="absolute inset-0 pointer-events-none opacity-0">
                <BaseNode id={id} selected={selected} title="Hidden" subtitle="FILE"><div/></BaseNode>
            </div>

            {/* Header */}
            <div 
                className="px-[13px] py-[12px] pb-[11px] flex items-center gap-[10px] border-b border-(--border) relative z-10"
                style={{ background: 'linear-gradient(135deg, var(--raised) 0%, rgba(22,20,18,0.5) 100%)' }}
            >
                <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-[14px] shrink-0 bg-(--red-dim) border border-[rgba(212,91,91,0.2)]">
                    📄
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-bold text-(--text) tracking-[0.01em] mb-[2px] leading-tight">PDF Document</div>
                    <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-(--red) leading-tight">FILE</div>
                </div>
                <button className="w-[22px] h-[22px] rounded-[5px] bg-transparent border border-transparent text-(--muted) flex items-center justify-center text-[14px] cursor-pointer transition-all tracking-[1px] hover:bg-(--raised) hover:border-(--border) hover:text-(--sub) leading-none pb-[6px]">
                    ...
                </button>
            </div>

            {/* Preview Area */}
            <div className={`relative overflow-hidden flex flex-col items-center bg-[#111010] z-10 ${url ? 'h-[300px]' : 'h-[140px] justify-center'}`}>
                {!url && (
                    <div 
                        className="absolute inset-0" 
                        style={{ background: 'linear-gradient(135deg, rgba(212,91,91,0.04) 0%, transparent 60%), repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(212,91,91,0.03) 12px, rgba(212,91,91,0.03) 13px)' }}
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
                        <div className="flex-1 overflow-auto flex justify-center bg-(--bg) p-3 relative scrollbar-hide">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-(--bg)/50 z-10 backdrop-blur-sm">
                                    <Loader2 className="animate-spin text-(--red)" size={20} />
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
                                    <div className="flex items-center justify-center h-full text-(--red) text-[10px] font-mono">
                                        Failed to load PDF.
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={240} // Fit nicely inside 280px container
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
                            className="flex-1 h-[34px] bg-(--bg) border border-(--border2) rounded-[10px] px-[10px] font-mono text-[10px] text-(--sub) outline-none transition-all placeholder:text-(--muted) focus:border-(--red) focus:shadow-[0_0_0_2px_rgba(212,91,91,0.1)]"
                            style={{ caretColor: 'var(--amber)' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={handleUrlSubmit}
                            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[15px] cursor-pointer shrink-0 transition-all bg-(--red-dim) text-(--red) border border-[rgba(212,91,91,0.2)] hover:bg-(--red) hover:text-white hover:border-(--red) hover:shadow-[0_0_12px_rgba(212,91,91,0.3)]"
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
                        className="w-full h-[36px] rounded-[10px] border border-dashed border-(--border2) bg-transparent font-sans text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-[7px] transition-all tracking-[0.03em] text-(--sub) hover:bg-(--red-dim) hover:border-(--red) hover:text-(--red)"
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
                    <div className={`w-[4px] h-[4px] rounded-full transition-colors duration-200 ${selected ? 'bg-(--red)' : 'bg-(--muted) group-hover:bg-(--red)'}`} />
                    <div className={`w-[4px] h-[4px] rounded-full transition-all duration-200 delay-50 ${selected ? 'bg-(--red) opacity-60' : 'bg-(--muted) group-hover:bg-(--red) group-hover:opacity-60'}`} />
                    <div className={`w-[4px] h-[4px] rounded-full transition-all duration-200 delay-100 ${selected ? 'bg-(--red) opacity-30' : 'bg-(--muted) group-hover:bg-(--red) group-hover:opacity-30'}`} />
                </div>
            </div>
        </div>
    );
}

export default memo(PdfNode);
