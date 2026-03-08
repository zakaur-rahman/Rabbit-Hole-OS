'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Globe, X, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface WebUrlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (url: string) => void;
}

export default function WebUrlModal({ isOpen, onClose, onSubmit }: WebUrlModalProps) {
    const [url, setUrl] = useState('');
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [preview, setPreview] = useState<{ domain: string; favicon: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!url) {
                setIsValid(null);
                setPreview(null);
                return;
            }

            try {
                // Add https if missing
                let urlToCheck = url;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    urlToCheck = 'https://' + url;
                }

                const parsed = new URL(urlToCheck);
                setIsValid(true);
                setPreview({
                    domain: parsed.hostname.replace('www.', ''),
                    favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`
                });
            } catch {
                setIsValid(false);
                setPreview(null);
            }
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [url]);

    const handleSubmit = useCallback(() => {
        if (!isValid) return;

        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = 'https://' + url;
        }

        onSubmit(finalUrl);
        setUrl('');
        onClose();
    }, [url, isValid, onSubmit, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValid) {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleSubmit, onClose, isValid]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Globe size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Add Web Page</h2>
                            <p className="text-xs text-neutral-500">Embed any webpage in your canvas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter URL (e.g., wikipedia.org)"
                            className={`w-full px-4 py-3 pr-12 rounded-xl bg-neutral-800 border-2 text-white placeholder-neutral-500 outline-none transition-colors ${isValid === null
                                ? 'border-neutral-700 focus:border-purple-500'
                                : isValid
                                    ? 'border-green-500/50'
                                    : 'border-red-500/50'
                                }`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isValid === true && <Check size={18} className="text-green-500" />}
                            {isValid === false && <AlertCircle size={18} className="text-red-500" />}
                        </div>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="mt-4 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700 flex items-center gap-3">
                            <img
                                src={preview.favicon}
                                alt=""
                                className="w-8 h-8 rounded"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">{preview.domain}</p>
                                <p className="text-xs text-neutral-500 truncate">{url}</p>
                            </div>
                            <ExternalLink size={14} className="text-neutral-500 shrink-0" />
                        </div>
                    )}

                    {/* Warning for common blocked sites */}
                    <p className="mt-4 text-xs text-neutral-500 text-center">
                        Note: Some sites (like Twitter/X, Facebook) may block embedding.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isValid
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                            }`}
                    >
                        <Globe size={14} />
                        Add Page
                    </button>
                </div>
            </div>
        </div>
    );
}
