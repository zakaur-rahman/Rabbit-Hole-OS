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

    const handleClear = () => {
        setUrl('');
        inputRef.current?.focus();
    };

    const handleQuickAdd = (domain: string) => {
        setUrl(domain);
        inputRef.current?.focus();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0908]/70 backdrop-blur-md">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div 
                className="relative w-[440px] bg-[var(--surface)] rounded-[14px] overflow-hidden"
                style={{
                    border: '1px solid var(--border2)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5)',
                    animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards'
                }}
            >
                {/* Header */}
                <div 
                    className="flex items-center gap-[14px] px-5 pt-5 pb-[18px] border-b border-[var(--border)] relative"
                    style={{ background: 'linear-gradient(135deg, var(--raised) 0%, rgba(22,20,18,0.5) 100%)' }}
                >
                    <div className="w-[38px] h-[38px] rounded-[9px] bg-[var(--amber-bg)] flex items-center justify-center text-[18px] shrink-0 border border-[rgba(232,160,32,0.2)]">
                        🌐
                    </div>
                    <div>
                        <div className="text-[15px] font-bold text-[var(--text)] tracking-[0.01em] mb-[3px]">Add Web Page</div>
                        <div className="font-mono text-[10px] text-[var(--muted)] tracking-[0.06em]">Embed any webpage in your canvas</div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 w-[26px] h-[26px] rounded-[6px] border border-[var(--border)] bg-[var(--raised)] text-[var(--sub)] flex items-center justify-center text-[14px] cursor-pointer transition-all hover:bg-[rgba(224,85,85,0.12)] hover:border-[rgba(224,85,85,0.3)] hover:text-[var(--red)] leading-none pb-[2px]"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pt-[22px] pb-[20px]">
                    <div className="flex items-center gap-[7px] text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--muted)] font-mono mb-2">
                        <div className="w-[3px] h-[3px] rounded-full bg-[var(--amber)]"></div>
                        Page URL
                    </div>

                    <div className="relative mb-[10px]">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[15px] transition-colors pointer-events-none ${url.trim().length > 0 ? 'text-[var(--amber)]' : 'text-[var(--muted)]'}`}>
                            ⌕
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. en.wikipedia.org/wiki/India"
                            spellCheck={false}
                            autoComplete="off"
                            className="w-full h-[44px] bg-[var(--bg)] border-[1.5px] border-[var(--border2)] rounded-[8px] pl-[40px] pr-[34px] font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--amber)]"
                            style={{ caretColor: 'var(--amber)' }}
                        />
                        {url.length > 0 && (
                            <button 
                                onClick={handleClear}
                                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-[4px] border-none bg-[var(--raised)] text-[var(--sub)] flex items-center justify-center text-[12px] cursor-pointer transition-all hover:bg-[var(--border2)] hover:text-[var(--text)] pb-[1px]"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-[6px] font-mono text-[10px] text-[var(--muted)] px-[2px]">
                        <span className="text-[11px]">⚠</span>
                        Some sites (like Twitter/X, Facebook) may block embedding.
                    </div>

                    <div className="flex items-center gap-[7px] text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--muted)] font-mono mt-[18px] mb-[10px]">
                        <div className="w-[3px] h-[3px] rounded-full bg-[var(--border2)]"></div>
                        Quick add
                    </div>

                    <div className="flex gap-[6px] flex-wrap">
                        {/* Quick suggestions */}
                        {[
                            { name: 'Wikipedia', icon: '📖', url: 'en.wikipedia.org' },
                            { name: 'GitHub', icon: '⬡', url: 'github.com' },
                            { name: 'arXiv', icon: '📄', url: 'arxiv.org' },
                            { name: 'Notion', icon: '◈', url: 'notion.so' },
                            { name: 'YouTube', icon: '▶', url: 'youtube.com' }
                        ].map((item) => (
                            <button
                                key={item.name}
                                onClick={() => handleQuickAdd(item.url)}
                                className="flex items-center gap-[6px] bg-[var(--raised)] border border-[var(--border)] rounded-[6px] px-[10px] py-[5px] text-[11px] font-medium text-[var(--sub)] cursor-pointer transition-all hover:bg-[var(--amber-bg)] hover:border-[rgba(232,160,32,0.25)] hover:text-[var(--amber)]"
                            >
                                <span className="text-[13px]">{item.icon}</span> {item.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div 
                    className="flex items-center justify-end gap-2 px-5 pt-[14px] pb-[18px] border-t border-[var(--border)]"
                    style={{ background: 'linear-gradient(135deg, rgba(22,20,18,0.5) 0%, var(--raised) 100%)' }}
                >
                    <button 
                        onClick={onClose}
                        className="h-[36px] px-[18px] bg-transparent border border-[var(--border)] rounded-[7px] text-[var(--sub)] font-sans text-[12px] font-semibold cursor-pointer transition-all hover:bg-[var(--raised)] hover:border-[var(--border2)] hover:text-[var(--text)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!url.trim()}
                        className={`h-[36px] px-[20px] rounded-[7px] font-sans text-[12px] font-bold flex items-center gap-[7px] transition-all tracking-[0.02em] ${
                            url.trim() && isValid
                                ? 'bg-[var(--amber)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--amber2)] shadow-[0_2px_12px_rgba(232,160,32,0.25)] hover:shadow-[0_2px_20px_rgba(232,160,32,0.35)] hover:-translate-y-[1px] active:translate-y-0'
                                : 'bg-[var(--raised)] text-[var(--muted)] border border-[var(--border)] cursor-not-allowed shadow-none'
                        }`}
                    >
                        <span className="text-[14px]">🌐</span> Add Page
                    </button>
                </div>
            </div>
            {/* PopIn Keyframes */}
            <style jsx global>{`
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.94) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);   }
                }
            `}</style>
        </div>
    );
}
