'use client';

import React from 'react';
import { useReactFlow } from 'reactflow';
import { Sparkles, Plus, Minus, Maximize2, Type, Layout, StickyNote, Download, FilePen, Settings2, Terminal, MessageSquare } from 'lucide-react';


interface GraphControlsProps {
    onChatSynthesis?: () => void;
    onGenerateReport?: () => void;
    onToggleLogs?: () => void;
    onAddNote?: () => void;
    onAddGroup?: () => void;
    onAddText?: () => void;
    onTemplate?: () => void;
    onExport?: () => void;
    onToggleChat?: () => void;
}

export default function GraphControls({ onChatSynthesis, onGenerateReport, onToggleLogs, onAddNote, onAddGroup, onAddText, onTemplate, onExport, onToggleChat }: GraphControlsProps) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    const btnBase = "w-[36px] h-[36px] flex items-center justify-center text-[var(--sub)] hover:text-[var(--text)] hover:bg-[var(--raised)] transition-colors cursor-pointer";
    const separator = "h-px bg-[var(--border)] mx-1.5";

    return (
        <div className="absolute top-1/2 -translate-y-1/2 right-3 flex flex-col gap-3 z-60 pointer-events-auto">

            {/* AI Chat Toggle */}
            <button
                onClick={() => onToggleChat?.()}
                className="w-[40px] h-[40px] rounded-(--r2) bg-[var(--amber)] hover:brightness-110 text-[var(--bg)] flex items-center justify-center shadow-lg shadow-[rgba(232,160,32,0.2)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="AI Chat — ask Cognode AI"
            >
                <MessageSquare size={18} fill="currentColor" />
            </button>

            <button
                onClick={() => onChatSynthesis?.()}
                className="w-[40px] h-[40px] rounded-(--r2) bg-emerald-500 hover:brightness-110 text-white flex items-center justify-center shadow-lg shadow-[rgba(16,185,129,0.15)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="AI Research synthesis"
            >
                <Sparkles size={18} fill="currentColor" />
            </button>

            {/* Generate Report — background synthesis → AST editor */}
            <button
                onClick={() => onGenerateReport?.()}
                className="w-[36px] h-[36px] rounded-(--r) border border-(--border) bg-(--surface) text-(--amber) hover:text-(--amber) hover:bg-(--raised) hover:border-(--amber)/30 flex items-center justify-center transition-all cursor-pointer"
                title="Generate research report and edit before exporting PDF"
            >
                <FilePen size={16} />
            </button>

            {/* Synthesis Logs */}
            <button
                onClick={() => onToggleLogs?.()}
                className="w-[36px] h-[36px] rounded-(--r) border border-(--border) bg-(--surface) text-(--sub) hover:text-(--text) hover:bg-(--raised) hover:border-(--border2) flex items-center justify-center transition-all cursor-pointer"
                title="Synthesis Logs"
            >
                <Terminal size={16} />
            </button>

            {/* Creation Tools */}
            <div className="flex flex-col bg-(--surface) border border-(--border) rounded-(--r2) overflow-hidden">
                <button onClick={onAddText} className={btnBase} title="Add Text">
                    <Type size={16} />
                </button>
                <div className={separator} />
                <button onClick={onAddGroup} className={btnBase} title="Add Section">
                    <Layout size={16} />
                </button>
                <div className={separator} />
                <button onClick={onAddNote} className={btnBase} title="Add Note">
                    <StickyNote size={16} />
                </button>
            </div>

            {/* Export & Fit */}
            <div className="flex flex-col bg-(--surface) border border-(--border) rounded-(--r2) overflow-hidden">
                <button onClick={onExport} className={btnBase} title="Export to Markdown">
                    <Download size={16} />
                </button>
                <div className={separator} />
                <button onClick={() => fitView({ padding: 0.2 })} className={btnBase} title="Fit to View">
                    <Maximize2 size={16} />
                </button>
            </div>

            {/* Templates & Import */}
            <button
                onClick={onTemplate}
                className="w-[36px] h-[36px] rounded-(--r) border border-(--border) bg-(--surface) text-(--sub) hover:text-(--text) hover:bg-(--raised) hover:border-(--border2) flex items-center justify-center transition-all cursor-pointer"
                title="Templates & Import"
            >
                <Settings2 size={16} />
            </button>

            {/* Zoom Controls */}
            <div className="flex flex-col bg-(--surface) border border-(--border) rounded-(--r2) overflow-hidden">
                <button onClick={() => zoomIn()} className={btnBase} title="Zoom In">
                    <Plus size={16} />
                </button>
                <div className={separator} />
                <button onClick={() => zoomOut()} className={btnBase} title="Zoom Out">
                    <Minus size={16} />
                </button>
            </div>
        </div>
    );
}
