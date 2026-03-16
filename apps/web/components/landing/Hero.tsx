"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { NodeCanvas } from './NodeCanvas';
import { cn } from '@/lib/utils';

export function Hero() {
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVis(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section id="hero" className="min-h-screen pt-[110px] pb-[60px] px-12 grid grid-cols-1 md:grid-cols-2 items-center relative overflow-hidden bg-paper text-ink">
            <NodeCanvas />
            
            <div className="relative z-10 flex flex-col items-start text-left">
                <div className={cn("text-[10px] tracking-[0.2em] uppercase text-amber mb-7 flex items-center gap-3 opacity-0 translate-y-3 transition-all duration-700", vis && "opacity-100 translate-y-0")}>
                    <div className="w-8 h-px bg-amber" />
                    v1.0 — Local-First Intelligence
                </div>
                
                <h1 className={cn("font-serif text-[clamp(48px,6.5vw,90px)] font-black leading-[1.0] tracking-tighter mb-8 opacity-0 translate-y-5 transition-all duration-700 delay-200", vis && "opacity-100 translate-y-0")}>
                    Build <em className="italic text-amber font-normal">Ideas</em><br />
                    as Connected<br />
                    Nodes
                </h1>
                
                <p className={cn("text-[13px] text-mid max-w-[380px] border-l-2 border-amber pl-[18px] leading-[1.9] mb-11 opacity-0 translate-y-4 transition-all duration-700 delay-350", vis && "opacity-100 translate-y-0")}>
                    Cognode lets you visually structure ideas, connect concepts, and execute workflows. No cloud required. No lock-in.
                </p>
                
                <div className={cn("flex items-center gap-[22px] opacity-0 translate-y-3 transition-all duration-700 delay-500", vis && "opacity-100 translate-y-0")}>
                    <Link 
                        href="/download" 
                        className="bg-ink text-paper px-[30px] py-[13px] text-[11px] tracking-[0.15em] uppercase no-underline transition-all hover:bg-amber hover:text-ink flex items-center gap-2 group font-mono"
                    >
                        Get Started
                        <span className="text-[13px] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                    </Link>
                    <Link 
                        href="#features" 
                        className="text-mid text-[11px] tracking-[0.12em] uppercase no-underline border-b border-rule pb-0.5 transition-colors hover:text-ink hover:border-ink font-mono"
                    >
                        Documentation
                    </Link>
                </div>
            </div>

            <div className={cn("relative z-10 flex items-center justify-center md:pl-10 opacity-0 translate-x-6 transition-all duration-800 delay-400 mt-12 md:mt-0", vis && "opacity-100 translate-x-0")}>
                <div className="w-full max-w-[480px] border border-rule bg-white shadow-[10px_10px_0_var(--faint)] overflow-hidden">
                    <div className="border-b border-rule p-[11px_15px] flex items-center justify-between bg-cream">
                        <span className="text-[10px] tracking-[0.14em] uppercase text-mid font-mono">Knowledge Graph — research_notes</span>
                        <div className="flex gap-[5px]">
                            <div className="w-2 h-2 rounded-full bg-faint border border-rule" />
                            <div className="w-2 h-2 rounded-full bg-amber border border-amber-l" />
                            <div className="w-2 h-2 rounded-full bg-faint border border-rule" />
                        </div>
                    </div>
                    
                    <svg id="graph-svg" viewBox="0 0 480 280" className="w-full h-auto min-h-[280px]">
                        <g stroke="var(--rule)" strokeWidth="1" fill="none">
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300]" x1="240" y1="130" x2="120" y2="70" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-200" x1="240" y1="130" x2="360" y2="80" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-400" x1="240" y1="130" x2="160" y2="210" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-600" x1="240" y1="130" x2="330" y2="200" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-[800ms]" x1="120" y1="70" x2="65" y2="155" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-[1000ms]" x1="360" y1="80" x2="415" y2="155" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-[1200ms]" x1="160" y1="210" x2="88" y2="258" />
                            <line className="animate-[drawEdge_1.8s_ease_forwards] stroke-dasharray-[300] stroke-dashoffset-[300] delay-[1400ms]" x1="330" y1="200" x2="398" y2="252" />
                        </g>
                        
                        <g font-family="var(--font-mono)" fontSize="8.5" fill="var(--mid)">
                            <text x="82" y="58">action_potentials.md</text>
                            <text x="330" y="68">transformers.md</text>
                            <text x="28" y="150">synaptic_plasticity.md</text>
                            <text x="385" y="150">attention_mechanism.md</text>
                            <text x="52" y="272">neuron_models.md</text>
                            <text x="358" y="266">fine_tuning.md</text>
                            <text x="110" y="228">research_notes.pdf</text>
                            <text x="272" y="222">paper_draft.md</text>
                        </g>

                        {/* Nodes */}
                        <circle cx="240" cy="130" r="13" fill="var(--paper)" stroke="var(--amber)" strokeWidth="2" />
                        <circle cx="240" cy="130" r="6" fill="var(--amber)" className="animate-[pulse_2.5s_ease-in-out_infinite]" />
                        
                        <circle cx="120" cy="70" r="6" fill="var(--paper)" stroke="var(--rule)" strokeWidth="1.5" className="animate-[pulse_2.5s_ease-in-out_infinite] delay-500" />
                        <circle cx="360" cy="80" r="6" fill="var(--paper)" stroke="var(--rule)" strokeWidth="1.5" className="animate-[pulse_2.5s_ease-in-out_infinite] delay-[1000ms]" />
                        <circle cx="160" cy="210" r="6" fill="var(--paper)" stroke="var(--rule)" strokeWidth="1.5" className="animate-[pulse_2.5s_ease-in-out_infinite] delay-[1500ms]" />
                        <circle cx="330" cy="200" r="7" fill="var(--paper)" stroke="var(--amber)" strokeWidth="1.5" className="animate-[pulse_2.5s_ease-in-out_infinite] delay-[2000ms]" />
                        
                        <circle cx="65" cy="155" r="4.5" fill="var(--cream)" stroke="var(--rule)" strokeWidth="1" />
                        <circle cx="415" cy="155" r="4.5" fill="var(--cream)" stroke="var(--rule)" strokeWidth="1" />
                        <circle cx="88" cy="258" r="4.5" fill="var(--cream)" stroke="var(--rule)" strokeWidth="1" />
                        <circle cx="398" cy="252" r="4.5" fill="var(--cream)" stroke="var(--rule)" strokeWidth="1" />
                    </svg>

                    <div className="border-t border-rule p-[9px_15px] flex gap-6 bg-cream">
                        <span className="text-[10px] text-mid tracking-[0.07em] font-mono"><span className="text-amber font-medium">24</span> nodes · <span className="text-amber font-medium">31</span> edges</span>
                        <span className="text-[10px] text-mid tracking-[0.07em] font-mono">AI linking · <span className="text-amber font-medium">active</span></span>
                        <span className="text-[10px] text-mid tracking-[0.07em] font-mono">Local · <span className="text-amber font-medium">offline</span></span>
                    </div>
                </div>
            </div>
        </section>
    );
}
