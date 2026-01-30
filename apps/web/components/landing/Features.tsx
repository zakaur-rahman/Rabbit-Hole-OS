"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Terminal, FileText, Cpu, Globe, Share2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceDemo } from "@/components/landing/WorkspaceDemo";

export function Features() {
    return (
        <Section id="features" className="bg-[#020617] relative overflow-hidden py-32">
            <Container>
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                    <ScrollReveal>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400 backdrop-blur-md mb-4">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Feature Set
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
                            Knowledge made <span className="text-emerald-400">tangible.</span>
                        </h2>
                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Capture with ease, connect with intelligence. The operating system for your second brain.
                        </p>
                    </ScrollReveal>
                </div>

                {/* The Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">

                    {/* Card 1: Ingestion (Span 2) */}
                    <ScrollReveal className="md:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/50 overflow-hidden relative group hover:border-emerald-500/20 transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="p-8 h-full flex flex-col justify-between relative z-10">
                            {/* Visual: Workspace Demo */}
                            <div className="w-full mb-6 relative z-20">
                                <WorkspaceDemo />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Universal Ingestion</h3>
                                <p className="text-zinc-400">Drag & drop any file. Cognode ingests Markdown, PDF, and HTML instantly, turning raw files into structured nodes.</p>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Card 2: Linking (Span 1) */}
                    <ScrollReveal delay={0.1} className="md:col-span-1 rounded-3xl border border-white/10 bg-zinc-900/50 overflow-hidden relative group hover:border-emerald-500/20 transition-all duration-500">
                        <div className="p-8 h-full flex flex-col relative z-10">
                            <h3 className="text-xl font-bold text-white mb-2">Semantic Linking</h3>
                            <p className="text-zinc-400 text-sm mb-6">AI discovers connections between notes automatically.</p>

                            {/* Visual: Node Graph */}
                            <div className="flex-1 min-h-[150px] relative rounded-lg bg-[#09090b] border border-white/5 flex items-center justify-center overflow-hidden">
                                {/* Central node */}
                                <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center z-20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    <Share2 className="w-4 h-4 text-emerald-400" />
                                </div>

                                {/* Satellite nodes */}
                                {[0, 120, 240].map((deg, i) => (
                                    <div key={i} className="absolute w-24 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent origin-left z-0" style={{ transform: `rotate(${deg}deg) translateX(0px)` }} />
                                ))}
                                {[0, 120, 240].map((deg, i) => (
                                    <div key={i} className="absolute w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center z-10" style={{ transform: `rotate(${deg}deg) translate(80px) rotate(-${deg}deg)` }}>
                                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Card 3: Globe/Privacy (Span 1) */}
                    <ScrollReveal delay={0.2} className="md:col-span-1 rounded-3xl border border-white/10 bg-zinc-900/50 overflow-hidden relative group hover:border-emerald-500/20 transition-all duration-500">
                        <div className="p-8 h-full flex flex-col justify-end relative z-10">
                            {/* Visual: Globe */}
                            <div className="absolute top-0 inset-x-0 h-[200px] flex items-start justify-center overflow-hidden pointer-events-none opacity-60">
                                {/* A simple CSS Sphere representation */}
                                <div className="w-[300px] h-[300px] rounded-full mt-[-100px] bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.2),transparent_60%)] border border-white/5 relative">
                                    {/* Grid lines */}
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 [transform:rotateX(60deg)_translateY(20px)]" />
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 [transform:rotateX(60deg)_translateY(50px)]" />
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 [transform:rotateX(60deg)_translateY(-20px)]" />
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 [transform:rotateY(60deg)]" />
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 [transform:rotateY(-60deg)]" />
                                    <div className="absolute top-[40%] left-[60%] w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)] z-20" />
                                </div>
                            </div>

                            <div className="relative pt-32">
                                <h3 className="text-xl font-bold text-white mb-2">Local-First Privacy</h3>
                                <p className="text-zinc-400 text-sm">Your knowledge graph lives on your device. Zero cloud dependency.</p>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Card 4: Editor (Span 2) */}
                    <ScrollReveal delay={0.3} className="md:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/50 overflow-hidden relative group hover:border-emerald-500/20 transition-all duration-500">
                        <div className="p-8 h-full flex flex-row items-center gap-8 relative z-10">
                            <div className="flex-1 space-y-2">
                                <h3 className="text-xl font-bold text-white">Distraction-Free Editor</h3>
                                <p className="text-zinc-400">Focus on your thoughts with our Zen Mode interface. Markdown native, keyboard centric.</p>
                            </div>

                            {/* Visual: Editor UI */}
                            <div className="flex-1 h-[180px] bg-[#09090b] rounded-tl-xl border-l border-t border-white/10 p-4 shadow-2xl relative translate-x-4 translate-y-4">
                                <div className="w-full h-full bg-zinc-900/50 rounded-lg p-4 space-y-3">
                                    <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-zinc-800/50 rounded" />
                                    <div className="h-3 w-full bg-zinc-800/50 rounded" />
                                    <div className="h-3 w-5/6 bg-zinc-800/50 rounded" />

                                    <div className="pt-4 flex gap-2">
                                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20">
                                            #neuroscience
                                        </div>
                                        <div className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">
                                            #draft
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </Container>
        </Section>
    );
}
