import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { FileText, Upload, Link, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import BaseNode from './BaseNode';
import { useGraphStore } from '@/store/graph.store';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


export interface PdfNodeData {
    title?: string;
    url?: string;
}

function PdfNode({ data, selected, id }: NodeProps<PdfNodeData>) {
    const [url, setUrl] = useState(data.url || '');
    const [inputUrl, setInputUrl] = useState('');
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const updateNode = useGraphStore(state => state.updateNode);

    // Width tracking for responsive PDF resizing
    const [containerWidth, setContainerWidth] = useState(300);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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
        <BaseNode
            id={id}
            selected={selected}
            title="PDF Document"
            subtitle="FILE"
            accentColor="red-500"
            icon={FileText}
            iconColor="text-red-400"
            minWidth={300}
            minHeight={400}
        >
            <div
                ref={containerRef}
                className="relative flex-1 flex flex-col h-full min-h-[300px] w-full bg-white rounded-lg overflow-hidden"
                onWheel={(e) => e.stopPropagation()}
            >
                {url ? (
                    <div className="flex flex-col h-full bg-neutral-800">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800">
                            <span className="text-xs text-neutral-400">
                                Page {pageNumber} of {numPages || '--'}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={pageNumber <= 1}
                                    onClick={() => changePage(-1)}
                                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    disabled={pageNumber >= (numPages || 1)}
                                    onClick={() => changePage(1)}
                                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Document View */}
                        <div className="flex-1 overflow-auto bg-neutral-800 flex justify-center p-4">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 z-10">
                                    <Loader2 className="animate-spin text-red-500" />
                                </div>
                            )}

                            <Document
                                file={url}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={(error) => {
                                    console.error('Error loading PDF:', error);
                                    setIsLoading(false);
                                }}
                                loading={
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="animate-spin text-red-500" />
                                    </div>
                                }
                                error={
                                    <div className="flex items-center justify-center h-full text-red-400 text-xs">
                                        Failed to load PDF.
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={3}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="shadow-lg !w-full [&_canvas]:!w-full [&_canvas]:!h-auto"
                                />
                            </Document>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 text-neutral-400 bg-neutral-900">
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                    placeholder="Paste PDF URL..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={handleUrlSubmit}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded transition-colors"
                                >
                                    <Link size={14} />
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase">
                                    <span className="bg-neutral-900 px-2 text-neutral-500">Or</span>
                                </div>
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
                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                            >
                                <Upload size={14} />
                                <span>Upload PDF</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(PdfNode);
