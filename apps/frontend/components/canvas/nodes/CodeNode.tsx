'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { NodeProps } from 'reactflow';
import { Code, CheckCircle, ChevronDown, Copy } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import BaseNode from './BaseNode';

export interface CodeNodeData {
    title: string;
    content?: string;
    url?: string;
    language?: string;
    upvotes?: number;
    source?: string;
    solved?: boolean;
}

function CodeNode({ data, selected, id }: NodeProps<CodeNodeData & { isPreview?: boolean, color?: string }>) {
    const isPreview = data.isPreview;
    const accentColor = data.color || "orange-500";
    const iconColor = accentColor === 'orange-500' ? 'text-orange-400' : `text-${accentColor.replace('500', '400')}`;
    const [title, setTitle] = useState(data.title || '');
    const [content, setContent] = useState(data.content || '');
    const [language, setLanguage] = useState(data.language || 'python');
    const [copied, setCopied] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const syncLinks = useGraphStore(state => state.syncLinks);
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        { id: 'python', label: 'Python', color: 'text-blue-400' },
        { id: 'javascript', label: 'JavaScript', color: 'text-yellow-400' },
        { id: 'typescript', label: 'TypeScript', color: 'text-blue-500' },
        { id: 'html', label: 'HTML', color: 'text-orange-500' },
        { id: 'css', label: 'CSS', color: 'text-blue-300' },
        { id: 'rust', label: 'Rust', color: 'text-orange-600' },
        { id: 'go', label: 'Go', color: 'text-cyan-400' },
        { id: 'sql', label: 'SQL', color: 'text-purple-400' },
    ];

    const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={title}
            onTitleChange={isPreview ? undefined : setTitle}
            subtitle="CODE SNIPPET"
            icon={Code}
            iconColor={iconColor}
            accentColor={accentColor}
            minWidth={450}
            minHeight={350}
            showResizer={!isPreview}
            headerRight={
                !isPreview && (
                    <div className="relative nodrag">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/80 hover:bg-neutral-800 rounded-lg border border-white/5 text-[10px] font-bold text-neutral-300 transition-all active:scale-95 uppercase tracking-tight"
                        >
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${currentLang.color}`} />
                            {currentLang.label}
                            <ChevronDown size={12} className={`text-neutral-500 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showLangMenu && (
                            <div className="absolute top-full right-0 mt-1 w-36 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => {
                                            setLanguage(lang.id);
                                            setShowLangMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white/5 transition-colors flex items-center justify-between group"
                                    >
                                        <span className={lang.id === language ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}>
                                            {lang.label}
                                        </span>
                                        {lang.id === language && <CheckCircle size={10} className="text-orange-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
        >
            <div className={`flex-1 flex flex-col ${isPreview ? 'p-3 pt-1' : 'p-4 pt-2'} gap-4 nodrag font-mono`}>
                {/* Editor Surface */}
                <div className="flex-1 relative bg-neutral-950/40 rounded-xl border border-white/5 overflow-hidden flex text-[13px] leading-6">
                    {/* Line Numbers */}
                    {!isPreview && (
                        <div className="py-4 pl-3 pr-2 text-neutral-600 text-right min-w-[3rem] select-none border-r border-white/5 bg-black/10">
                            {lineNumbers.map(n => <div key={n}>{n}.</div>)}
                        </div>
                    )}

                    {/* Textarea */}
                    <div className="flex-1 relative min-h-[100px]">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
                            readOnly={isPreview}
                            placeholder={isPreview ? "" : "// Paste or write code here..."}
                            className={`w-full h-full bg-transparent text-neutral-300 ${isPreview ? 'p-3' : 'p-4'} outline-none resize-none focus:ring-0 whitespace-pre scrollbar-hide`}
                            spellCheck={false}
                            style={{ fontSize: isPreview ? '11px' : '13px' }}
                        />

                        {/* Floating Copy Button */}
                        {!isPreview && (
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(content);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-90 border ${copied
                                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                        : 'bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                        }`}
                                    title="Copy code"
                                >
                                    <div className="p-1 rounded bg-black/20">
                                        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(CodeNode);
