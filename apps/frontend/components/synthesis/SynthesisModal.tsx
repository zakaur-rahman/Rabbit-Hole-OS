'use client';

import React, { useState } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { synthesisApi } from '@/lib/api';
import { X, Sparkles, Loader2, ArrowRight, Copy, Check } from 'lucide-react';

interface SynthesisModalProps {
    onClose: () => void;
}

export default function SynthesisModal({ onClose }: SynthesisModalProps) {
    const { nodes, selectedNodeId } = useGraphStore();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [sources, setSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Count selected nodes (in future: support multi-select)
    const selectedCount = selectedNodeId ? 1 : nodes.length;

    const handleSynthesize = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResult('');
        setSources([]);

        try {
            const nodeIds = selectedNodeId ? [selectedNodeId] : nodes.map((n: any) => n.id);

            const response = await synthesisApi.generate({
                node_ids: nodeIds,
                query: query.trim(),
            });

            setResult(response.summary);
            setSources(response.sources);
        } catch (e) {
            console.error('Synthesis error:', e);
            setResult('Error generating synthesis. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="absolute bottom-4 left-4 right-20 z-20">
            <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">SYNTHESIS ACTIVE</h2>
                            <p className="text-xs text-neutral-400">{selectedCount} items selected</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Input Area */}
                <div className="p-4">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Compare these sources on..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSynthesize()}
                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
                        />
                        <button
                            onClick={handleSynthesize}
                            disabled={loading || !query.trim()}
                            className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl flex items-center gap-2 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    RUN <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className="mt-4">
                            {/* Sources */}
                            {sources.length > 0 && (
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-xs text-neutral-500">Sources:</span>
                                    {sources.map((source, i) => (
                                        <span key={i} className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4 bg-neutral-800/50 rounded-xl border border-neutral-700 relative">
                                <div className="prose prose-sm prose-invert max-w-none">
                                    <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                        {result}
                                    </div>
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                >
                                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
