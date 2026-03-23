'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { CheckCircle, ChevronDown, Copy } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { NodeActionsToolbar } from '../NodeActionsToolbar';
import { useNodeTheme } from '@/hooks/useNodeTheme';

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

    // Subscribe to color from node data
    const nodeColor = useGraphStore(state => state.nodes.find(n => n.id === id)?.data?.color);
    const { theme, style: themeStyle } = useNodeTheme(nodeColor || 'emerald');

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

    // Persist resize dimensions
    const onResizeEnd = useCallback((_event: unknown, params: { width: number; height: number }) => {
        const { width, height } = params;
        updateNodeAndPersist(id, {
            style: { width, height }
        });
    }, [id, updateNodeAndPersist]);

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
                lineClassName="!border-[var(--node-primary)]"
                handleClassName="h-2 w-2 !bg-[#0e1012] !border !border-[var(--node-primary)] rounded-sm"
                onResizeEnd={onResizeEnd}
            />
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    relative w-full h-full min-w-[400px]
                    rounded-[10px] bg-[#191817] border transition-all duration-200
                    flex flex-col overflow-hidden
                `}
                style={{
                    ...themeStyle,
                    borderColor: selected ? theme.hover : 'rgba(255,255,255,0.05)',
                    boxShadow: selected
                        ? `0 0 0 1px ${theme.glow}, 0 8px 32px rgba(0,0,0,0.5)`
                        : undefined,
                }}
            >
                <NodeActionsToolbar nodeId={id} isVisible={isHovered} onMouseEnter={handleMouseEnter} />

                {/* Header Section */}
                <div className="flex items-center gap-2 px-3 pt-[10px] pb-[9px] border-b border-white/5">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M4.5 3.5L1.5 6.5l3 3M8.5 3.5L11.5 6.5l-3 3M7.5 1.5l-2 10" stroke={theme.primary} strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
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
                        <div
                            className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-[7px] py-[2px] rounded-[3px] border shadow-[0_1px_2px_rgba(0,0,0,0.1)] leading-snug"
                            style={{
                                borderColor: `${theme.primary}38`,
                                backgroundColor: `${theme.primary}14`,
                                color: theme.primary,
                            }}
                        >
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
                                        className={`w-full text-left px-3 py-1.5 font-mono text-[10px] tracking-wide transition-colors`}
                                        style={{
                                            color: language === lang.id ? theme.primary : undefined,
                                            backgroundColor: language === lang.id ? `${theme.primary}0d` : undefined,
                                        }}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Section - Editor Content */}
                <div className="relative flex flex-1 min-h-[140px] overflow-hidden">
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
                            className="w-full h-full bg-transparent p-3 pt-3 font-mono text-[11.5px] font-light leading-[1.8] text-[#d4d8de]/60 focus:text-[#d4d8de] placeholder-[#d4d8de]/10 outline-none resize-none scrollbar-hide nodrag nowheel"
                            onWheel={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="// Start coding..."
                        />
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between px-3 h-[42px] border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-[6px] h-[6px] rounded-full opacity-50"
                            style={{ backgroundColor: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }}
                        />
                        <span className="font-mono text-[9px] text-[#d4d8de]/20 tracking-[0.06em]">Ready to execute</span>
                    </div>

                    <div className="flex gap-[6px]">
                        <button 
                            onClick={async () => {
                                await navigator.clipboard.writeText(content);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="h-[22px] px-2 flex items-center gap-1.5 rounded-[5px] border border-white/5 bg-transparent font-mono text-[9px] text-[#d4d8de]/20 transition-all outline-none"
                            style={{
                                '--hover-border': `${theme.primary}4d`,
                                '--hover-color': `${theme.primary}cc`,
                                '--hover-bg': `${theme.primary}0d`,
                            } as React.CSSProperties}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = `${theme.primary}4d`;
                                e.currentTarget.style.color = `${theme.primary}cc`;
                                e.currentTarget.style.backgroundColor = `${theme.primary}0d`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.color = '';
                                e.currentTarget.style.backgroundColor = '';
                            }}
                        >
                            {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
                            {copied ? 'COPIED' : 'COPY'}
                        </button>
                        <button
                            className="h-[22px] px-2 flex items-center gap-1.5 rounded-[5px] border font-mono text-[9px] font-semibold transition-all outline-none"
                            style={{
                                borderColor: `${theme.primary}33`,
                                backgroundColor: `${theme.primary}1a`,
                                color: theme.primary,
                            }}
                        >
                            <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M7.5 4.5l-6 3.5v-7z"/></svg>
                            RUN
                        </button>
                    </div>
                </div>

                {/* Handles - standardized Cognode style */}
                <div className={`transition-opacity duration-300 ${(isHovered || selected) ? 'opacity-100' : 'opacity-0'}`}>
                    <Handle type="target" position={Position.Top} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="top-target" />
                    <Handle type="source" position={Position.Right} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="right-source" />
                    <Handle type="source" position={Position.Bottom} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="bottom-source" />
                    <Handle type="target" position={Position.Left} className="w-[9px]! h-[9px]! !bg-[#0e1012] !border-[1.5px] !border-white/15 hover:!border-white/50 !transition-all z-50!" id="left-target" />
                </div>
            </div>
        </>
    );
}

export default memo(CodeNode);
