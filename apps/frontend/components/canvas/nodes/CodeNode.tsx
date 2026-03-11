'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { CheckCircle, ChevronDown, Copy } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';

export interface CodeNodeData {
    title: string;
    content?: string;
    url?: string;
    language?: string;
    upvotes?: number;
    source?: string;
    solved?: boolean;
}

function CodeNode({ id, data, selected }: NodeProps<CodeNodeData & { isPreview?: boolean, color?: string }>) {
    const isPreview = data.isPreview;
    const [title, setTitle] = useState(data.title || '');
    const [content, setContent] = useState(data.content || '');
    const [language, setLanguage] = useState(data.language || 'python');
    const [copied, setCopied] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const syncLinks = useGraphStore(state => state.syncLinks);
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Debounced sync
    useEffect(() => {
        if (isPreview) return;
        const timer = setTimeout(() => {
            if (content !== data.content || title !== data.title || language !== data.language) {
                syncLinks(id, content);
                updateNodeAndPersist(id, {
                    data: { ...data, content, title, language }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content, title, language, id, syncLinks, updateNodeAndPersist, data, isPreview]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isPreview) return;
        setContent(e.target.value);
    };

    const lineCount = content.split('\n').length;
    const lineNumbers = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

    const LANGUAGES = [
        { id: 'python', label: 'Python', badge: 'PY' },
        { id: 'javascript', label: 'JavaScript', badge: 'JS' },
        { id: 'typescript', label: 'TypeScript', badge: 'TS' },
        { id: 'html', label: 'HTML', badge: 'HT' },
        { id: 'css', label: 'CSS', badge: 'CS' },
        { id: 'rust', label: 'Rust', badge: 'RS' },
        { id: 'go', label: 'Go', badge: 'GO' },
        { id: 'sql', label: 'SQL', badge: 'SQ' },
    ];

    const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

    return (
        <>
            <NodeResizer
                minWidth={400}
                minHeight={250}
                isVisible={selected}
                lineClassName="border-[#2dd4b0]/50"
                handleClassName="h-2 w-2 bg-[#0e1012] border border-[#2dd4b0] rounded-sm"
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[400px]
                    rounded-[10px] bg-[#161a1e] border transition-all duration-200
                    ${selected
                        ? `border-[#2dd4b0]/50 shadow-[0_0_0_1px_rgba(45,212,176,0.18),0_8px_32px_rgba(0,0,0,0.5)]`
                        : `border-white/5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                    }
                `}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-white/5">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M4.5 3.5L1.5 6.5l3 3M8.5 3.5L11.5 6.5l-3 3M7.5 1.5l-2 10" stroke="#2dd4b0" strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="flex-1 font-mono text-[12.5px] font-medium text-[#d4d8de] tracking-tight truncate">
                        <input
                            className="bg-transparent border-none outline-none w-full cursor-text placeholder-[#d4d8de]/20"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Untitled Script"
                        />
                    </div>
                    
                    {/* Language Selector */}
                    <div className="relative flex items-center gap-[6px]">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-1 font-mono text-[9px] text-[#d4d8de]/40 hover:text-[#d4d8de]/80 transition-colors uppercase tracking-[0.08em] outline-none"
                        >
                            {currentLang.label}
                            <ChevronDown size={10} className={`transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-[7px] py-[2px] rounded-[3px] border border-[#2dd4b0]/22 bg-[#2dd4b0]/08 text-[#2dd4b0] shadow-[0_1px_2px_rgba(0,0,0,0.1)] leading-snug">
                            {currentLang.badge}
                        </div>

                        {showLangMenu && (
                            <div className="absolute top-[calc(100%+12px)] right-0 w-32 bg-[#161a1e] border border-white/10 rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1 z-100">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.id}
                                        onClick={() => {
                                            setLanguage(lang.id);
                                            setShowLangMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 font-mono text-[10px] tracking-wide transition-colors ${language === lang.id ? 'text-[#2dd4b0] bg-[#2dd4b0]/5' : 'text-[#d4d8de]/40 hover:text-[#d4d8de] hover:bg-white/5'}`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Section - Editor Content */}
                <div className="relative flex h-[calc(100%-88px)] min-h-[140px]">
                    {/* Gutter */}
                    <div className="w-[34px] shrink-0 bg-white/2 border-r border-white/5 flex flex-col items-end pt-3 pr-[10px] select-none pointer-events-none">
                        {lineNumbers.map(n => (
                            <div key={n} className="font-mono text-[11px] leading-[1.8] text-[#d4d8de]/10">{n}</div>
                        ))}
                    </div>

                    {/* Editor Area */}
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
                            readOnly={isPreview}
                            spellCheck={false}
                            className="w-full h-full bg-transparent p-3 pt-3 font-mono text-[11.5px] font-light leading-[1.8] text-[#d4d8de]/60 focus:text-[#d4d8de] placeholder-[#d4d8de]/10 outline-none resize-none scrollbar-hide nodrag"
                            placeholder="// Start coding..."
                        />
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between px-3 h-[42px] border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#2dd4b0] opacity-50 shadow-[0_0_6px_#2dd4b0]" />
                        <span className="font-mono text-[9px] text-[#d4d8de]/20 tracking-[0.06em]">Ready to execute</span>
                    </div>

                    <div className="flex gap-[6px]">
                        <button 
                            onClick={async () => {
                                await navigator.clipboard.writeText(content);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="h-[22px] px-2 flex items-center gap-1.5 rounded-[5px] border border-white/5 bg-transparent font-mono text-[9px] text-[#d4d8de]/20 hover:border-[#2dd4b0]/30 hover:text-[#2dd4b0]/80 hover:bg-[#2dd4b0]/5 transition-all outline-none"
                        >
                            {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
                            {copied ? 'COPIED' : 'COPY'}
                        </button>
                        <button className="h-[22px] px-2 flex items-center gap-1.5 rounded-[5px] border border-[#2dd4b0]/20 bg-[#2dd4b0]/10 font-mono text-[9px] font-semibold text-[#2dd4b0] hover:bg-[#2dd4b0]/20 transition-all outline-none">
                            <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M7.5 4.5l-6 3.5v-7z"/></svg>
                            RUN
                        </button>
                    </div>
                </div>

                {/* Handles - standardized Cognode style */}
                {(isHovered || selected) && (
                    <>
                        <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="top" />
                        <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="right" />
                        <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="bottom" />
                        <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! bg-[#0e1012]! border-[1.5px]! border-white/15! hover:border-white/50! transition-all! z-50!" id="left" />
                    </>
                )}
            </div>
        </>
    );
}

export default memo(CodeNode);
