"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Folder, MoreHorizontal, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const files = [
    { id: "research_notes", label: "research_notes", color: "text-emerald-400" },
    { id: "algorithms", label: "algorithms", color: "text-blue-400" },
    { id: "project_alpha", label: "project_alpha", color: "text-purple-400" },
    { id: "meeting_logs", label: "meeting_logs", color: "text-amber-400" },
    { id: "sources_pdf", label: "sources_pdf", color: "text-rose-400" },
];

export function WorkspaceDemo() {
    const [selectedids, setSelectedIds] = useState<string[]>(["algorithms"]);

    const toggleFile = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="w-full h-full min-h-[300px] flex rounded-xl border border-white/10 bg-[#09090b] shadow-2xl overflow-hidden font-mono text-xs select-none">
            {/* Sidebar: Explorer */}
            <div className="w-48 border-r border-white/10 bg-zinc-900/50 flex flex-col">
                {/* Window Controls */}
                <div className="h-8 border-b border-white/5 flex items-center px-3 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
                    <div className="ml-auto px-2 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-500">
                        cognode-workspace
                    </div>
                </div>

                <div className="p-3 text-zinc-500 font-bold tracking-wider mb-1 text-[10px]">
                    EXPLORER
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                    {files.map((file) => {
                        const isSelected = selectedids.includes(file.id);
                        return (
                            <div
                                key={file.id}
                                onClick={() => toggleFile(file.id)}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors group",
                                    isSelected
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-300"
                                )}
                            >
                                {/* Checkbox */}
                                <div
                                    className={cn(
                                        "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                        isSelected
                                            ? "bg-emerald-500 border-emerald-500"
                                            : "border-zinc-700 group-hover:border-zinc-500"
                                    )}
                                >
                                    {isSelected && (
                                        <motion.svg
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-2.5 h-2.5 text-black"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </motion.svg>
                                    )}
                                </div>
                                <span>{file.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Area: Graph */}
            <div className="flex-1 relative bg-[#050505] overflow-hidden">
                {/* Grid Background */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                {/* Graph */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Central Hub */}
                    <div className="relative z-20">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse" />
                        {/* Ripple rings */}
                        <div className="absolute inset-0 -m-8 border border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="absolute inset-0 -m-16 border border-emerald-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    </div>

                    {/* Satellite Nodes */}
                    {files.map((file, i) => {
                        const deg = (360 / files.length) * i - 90; // Start from top
                        const isSelected = selectedids.includes(file.id);
                        const radius = 100;
                        const x = Math.cos((deg * Math.PI) / 180) * radius;
                        const y = Math.sin((deg * Math.PI) / 180) * radius;

                        return (
                            <div key={file.id}>
                                {/* Connection Line */}
                                <svg className="absolute top-1/2 left-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                                    <line
                                        x1="100"
                                        y1="100"
                                        x2={100 + x}
                                        y2={100 + y}
                                        className={cn(
                                            "transition-all duration-500",
                                            isSelected ? "stroke-emerald-500/50 stroke-[1.5px]" : "stroke-zinc-800 stroke-[1px]"
                                        )}
                                    />
                                </svg>

                                {/* Node */}
                                <motion.div
                                    className={cn(
                                        "absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full border transition-all duration-500 z-10 flex items-center justify-center",
                                        isSelected
                                            ? "bg-emerald-900/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-110"
                                            : "bg-zinc-900 border-zinc-800 scale-100"
                                    )}
                                    style={{ transform: `translate(${x}px, ${y}px)` }}
                                >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                </motion.div>
                            </div>
                        );
                    })}
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-zinc-900/80 backdrop-blur border border-white/5 px-3 py-1.5 rounded-full shadow-xl">
                    <div className={cn("w-2 h-2 rounded-full transition-colors", selectedids.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-600")} />
                    <span className="text-[10px] text-zinc-400">
                        {selectedids.length > 0 ? "Processing incoming data..." : "Waiting for input..."}
                    </span>
                </div>
            </div>
        </div>
    );
}
