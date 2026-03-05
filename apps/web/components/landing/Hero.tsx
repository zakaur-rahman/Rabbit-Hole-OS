"use client";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { HeroCanvas } from "@/components/landing/HeroCanvas";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRef } from "react";
import { ChevronRight, Download } from "lucide-react";


export function Hero() {
    const screenRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative min-h-[120vh] flex flex-col items-center pt-[140px] overflow-hidden bg-[#020617]">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

            {/* Top Light/Glow (Spotlight effect) */}
            <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 blur-[100px] rounded-full pointer-events-none" />


            {/* The Circuit Canvas */}
            <HeroCanvas targetElementRef={screenRef} />

            <Container className="relative z-10 flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-medium text-emerald-400 backdrop-blur-md"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Cognode v1.0
                    <span className="mx-1 text-emerald-500/30">|</span>
                    <span className="text-emerald-400/80">Local-First Intelligence</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-8 max-w-5xl z-20"
                >
                    Turn Chaos Into <br />
                    <span className="text-transparent bg-clip-text bg-linear-to-b from-emerald-400 to-emerald-600">Structured Insight</span>
                </motion.h1>

                {/* Subhead */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed tracking-tight"
                >
                    The desktop research station that ingests your scattered notes and weaves them into a living knowledge graph. No cloud required.
                </motion.p>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex flex-col sm:flex-row items-center gap-4 mb-24"
                >
                    <Link
                        href="/download"
                        className={cn(
                            buttonVariants({ size: "lg" }),
                            "h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all rounded-full"
                        )}
                    >
                        <Download className="h-5 w-5" />
                        Download for Desktop
                    </Link>
                    <Link
                        href="#features"
                        className={cn(
                            buttonVariants({ size: "lg", variant: "outline" }),
                            "h-14 px-8 text-lg border-zinc-800 text-zinc-300 hover:bg-zinc-900 bg-zinc-950/50 backdrop-blur-sm rounded-full"
                        )}
                    >
                        See How It Works
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </motion.div>
            </Container>


            {/* --- THE SCREEN (Target) --- */}
            <motion.div
                ref={screenRef}
                initial={{ opacity: 0, rotateX: 20, y: 50 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
                style={{ perspective: "1000px" }}
                className="relative z-20 w-full max-w-6xl mx-auto px-4 perspective-1000"
            >
                <div className="relative rounded-xl border border-white/10 bg-[#09090b] shadow-2xl overflow-hidden aspect-16/10 group ring-1 ring-white/5">
                    {/* Screen Header */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2 z-10 backdrop-blur-md">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-zinc-700/50" />
                            <div className="w-3 h-3 rounded-full bg-zinc-700/50" />
                            <div className="w-3 h-3 rounded-full bg-zinc-700/50" />
                        </div>
                        <div className="ml-4 flex h-6 items-center rounded-md bg-black/20 px-3 border border-white/5">
                            <span className="text-xs text-zinc-500">cognode-workspace</span>
                        </div>
                    </div>

                    {/* Screen Content */}
                    <div className="absolute inset-0 pt-10 flex text-zinc-400 font-mono text-sm">
                        {/* Sidebar */}
                        <div className="w-64 border-r border-white/5 bg-zinc-950/50 p-4 hidden md:flex flex-col gap-4">
                            <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Explorer</div>
                            <div className="space-y-1">
                                {[
                                    "research_notes",
                                    "algorithms",
                                    "project_alpha",
                                    "meeting_logs",
                                    "sources_pdf"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors">
                                        <div className="w-4 h-4 rounded-sm bg-emerald-500/10 border border-emerald-500/20" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Canvas Area */}
                        <div className="flex-1 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-size-[24px_24px] relative overflow-hidden flex items-center justify-center">
                            {/* Central Node */}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                {/* The Brain Node */}
                                <div className="w-32 h-32 rounded-full border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-center shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] backdrop-blur-sm">
                                    <div className="w-20 h-20 rounded-full border border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center animate-pulse">
                                        <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,1)]" />
                                    </div>
                                </div>

                                {/* Connected Satellite Nodes */}
                                {[0, 72, 144, 216, 288].map((deg, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600"
                                        style={{
                                            transform: `rotate(${deg}deg) translate(120px) rotate(-${deg}deg)`,
                                        }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 w-[120px] h-px bg-linear-to-l from-zinc-700/0 to-zinc-700/50 -translate-y-1/2 -translate-x-[120px] -z-10 origin-right" style={{ transform: `rotate(${deg}deg)` }} />
                                    </div>
                                ))}
                            </div>

                            {/* Ingestion Status Overlay */}
                            <div className="absolute bottom-6 right-6 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 backdrop-blur-md shadow-xl flex items-center gap-3">
                                <div className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <span className="text-xs text-zinc-300">Processing incoming data...</span>
                            </div>
                        </div>
                    </div>

                    {/* Reflective Sheen */}
                    <div className="absolute inset-0 bg-linear-to-tr from-white/5 via-transparent to-transparent pointer-events-none mix-blend-overlay" />
                </div>

                {/* Ground Glow */}
                <div className="absolute -bottom-20 left-10 right-10 h-[150px] bg-emerald-500/10 blur-[100px] -z-10 rounded-full" />
            </motion.div>
        </div>
    );
}
