'use client';

import React from 'react';
import { X, Download, Loader2, Sparkles } from 'lucide-react';

interface ResearchPdfModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    isLoading: boolean;
    title?: string;
    onOpenAdvancedEditor?: () => void;
    error?: string | null;
    stage?: string | null;
    message?: string | null;
}

export default function ResearchPdfModal({
    isOpen,
    onClose,
    pdfUrl,
    isLoading,
    title,
    onOpenAdvancedEditor,
    error,
    stage,
    message
}: ResearchPdfModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[90vw] h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-50 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/20">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Research Synthesis</h2>
                            <p className="text-[12px] text-neutral-400 font-medium">{title || 'Generating comprehensive report...'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pdfUrl && (
                            <>
                                {onOpenAdvancedEditor && (
                                    <button
                                        onClick={onOpenAdvancedEditor}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-indigo-900/20 border border-indigo-400/30"
                                    >
                                        <Sparkles size={16} />
                                        Open in Advanced Editor
                                    </button>
                                )}
                                <a
                                    href={pdfUrl}
                                    download={`Research_Report.pdf`}
                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors font-medium text-sm"
                                >
                                    <Download size={16} />
                                    Download PDF
                                </a>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-neutral-950 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                                <div className="w-20 h-20 border-4 border-neutral-800 border-t-green-500 rounded-full animate-spin relative z-10" />
                                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500 animate-pulse z-20" />
                            </div>
                            <div className="text-center space-y-4 max-w-sm">
                                <h3 className="text-xl font-bold text-white">
                                    {stage || 'Synthesizing Research'}
                                </h3>
                                <div className="space-y-2">
                                    <p className="text-neutral-400 text-sm font-medium animate-pulse">
                                        {message || 'AI is analyzing collected contexts, merging topics, and validating sources...'}
                                    </p>
                                    <div className="flex gap-1 justify-center">
                                        {['Planning', 'Writing', 'Reviewing', 'Visual Analysis', 'Compiling'].map((s) => (
                                            <div
                                                key={s}
                                                className={`h-1 w-8 rounded-full transition-colors duration-500 ${stage === s ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-neutral-800'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={`${pdfUrl}#view=FitH`}
                            className="w-full h-full border-none"
                            title="Research PDF"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 p-8">
                            <div className="text-red-400 text-lg font-semibold">Failed to generate PDF</div>
                            {error && (
                                <div className="bg-red-950/50 border border-red-800/50 rounded-lg p-4 max-w-2xl text-left">
                                    <p className="text-red-300 text-sm font-mono break-all">{error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
