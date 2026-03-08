'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { synthesisApi, ApiNode } from '@/lib/api';
import { useGraphStore } from '@/store/graph.store';

interface SearchModalProps {
    onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ApiNode[]>([]);
    const [loading, setLoading] = useState(false);
    const { selectNode } = useGraphStore();
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const [activeIndex, setActiveIndex] = useState(0);

    const handleSelectResult = useCallback((node: ApiNode) => {
        selectNode(node.id);
        onClose();
    }, [selectNode, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[activeIndex]) {
                    handleSelectResult(results[activeIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, results, activeIndex, handleSelectResult]);

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        setActiveIndex(0);

        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await synthesisApi.search(searchQuery);
            setResults(response.results);
        } catch (e) {
            console.error('Search error:', e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
                    <Search size={20} className="text-neutral-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search Cognode..."
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 bg-transparent text-lg text-white placeholder-neutral-500 outline-none"
                    />
                    {loading && <Loader2 size={20} className="text-neutral-500 animate-spin" />}
                    <kbd className="px-2 py-1 text-xs font-medium text-neutral-500 bg-neutral-800 rounded">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {results.length === 0 && query.length >= 2 && !loading && (
                        <div className="p-8 text-center text-neutral-500">
                            No results found for &quot;{query}&quot;
                        </div>
                    )}

                    {results.map((node, index) => (
                        <button
                            key={node.id}
                            onClick={() => handleSelectResult(node)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={`w-full p-4 flex items-start gap-3 transition-colors text-left border-l-2 ${index === activeIndex
                                ? 'bg-neutral-800 border-green-500'
                                : 'hover:bg-neutral-800 border-transparent'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium text-neutral-400 uppercase">
                                    {node.type.charAt(0)}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white truncate">{node.title}</h4>
                                <p className="text-xs text-neutral-500 truncate mt-0.5">{node.snippet}</p>
                            </div>
                            <span className="text-[10px] text-neutral-600 uppercase tracking-wider shrink-0">
                                {node.type}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Footer Hints */}
                <div className="p-3 border-t border-neutral-800 flex items-center gap-4 text-xs text-neutral-500">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>ESC Close</span>
                </div>
            </div>
        </div>
    );
}
