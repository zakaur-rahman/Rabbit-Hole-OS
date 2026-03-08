'use client';

import React from 'react';
import { useReactFlow } from 'reactflow';
import { Sparkles, Plus, Minus, Maximize2, Type, Layout, StickyNote, MousePointer2, Download, Network, FilePen, LayoutTemplate } from 'lucide-react';


interface GraphControlsProps {
    onSynthesis?: () => void;
    onASTEditor?: () => void;
    onAddNote?: () => void;
    onAddGroup?: () => void;
    onAddText?: () => void;
    onTemplate?: () => void;
    onExport?: () => void;
    onFitSelection?: () => void;
    onImportCanvas?: () => void;
}

export default function GraphControls({ onSynthesis, onASTEditor, onAddNote, onAddGroup, onAddText, onTemplate, onExport, onFitSelection, onImportCanvas }: GraphControlsProps) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    return (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-4 z-60 pointer-events-auto">
            {/* AI Synthesis */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => onSynthesis?.()}
                    className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-400 text-neutral-900 flex items-center justify-center shadow-lg shadow-black/20 transition-all hover:scale-110 active:scale-95"
                    title="Quick AI Synthesis (PDF)"
                >
                    <Sparkles size={18} fill="currentColor" className="text-neutral-900" />
                </button>
                <button
                    onClick={() => onASTEditor?.()}
                    className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-lg shadow-black/20 transition-all hover:scale-110 active:scale-95"
                    title="Advanced Document Editor (AST)"
                >
                    <FilePen size={18} />
                </button>
            </div>

            {/* Creation Tools */}
            <div className="flex flex-col bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
                <button
                    onClick={onAddNote}
                    className="w-10 h-10 flex items-center justify-center text-yellow-500 hover:bg-white/10 transition-colors"
                    title="Add Note"
                >
                    <StickyNote size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={onAddGroup}
                    className="w-10 h-10 flex items-center justify-center text-blue-400 hover:bg-white/10 transition-colors"
                    title="Add Section"
                >
                    <Layout size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={onAddText}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Add Text"
                >
                    <Type size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={onTemplate}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Use Template"
                >
                    <LayoutTemplate size={18} />
                </button>
                <button
                    onClick={onExport}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Export to Markdown"
                >
                    <Download size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={onImportCanvas}
                    className="w-10 h-10 flex items-center justify-center text-indigo-400 hover:bg-white/10 transition-colors"
                    title="Import Canvas"
                >
                    <Network size={18} />
                </button>
            </div>

            {/* Navigation Tools */}
            <div className="flex flex-col bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
                <button
                    onClick={() => zoomIn()}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Zoom In"
                >
                    <Plus size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={() => zoomOut()}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Zoom Out"
                >
                    <Minus size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={() => fitView({ padding: 0.2 })}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Fit to View"
                >
                    <Maximize2 size={18} />
                </button>
                <div className="h-px bg-neutral-800 mx-2" />
                <button
                    onClick={onFitSelection}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Zoom to Selection"
                >
                    <MousePointer2 size={18} />
                </button>

            </div>
        </div>
    );
}
