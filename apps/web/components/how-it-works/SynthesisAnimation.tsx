"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Cpu, Loader2 } from "lucide-react";

const agents = [
    { name: "Planner Agent", status: "Structuring research outline...", desc: "Analyzing node clusters and defining logical hierarchy." },
    { name: "Researcher Agent", status: "Deep-web verification active...", desc: "Cross-referencing claims against external knowledge bases." },
    { name: "Cross-Check Agent", status: "Auditing semantic links...", desc: "Identifying hidden gaps and verifying connection logic." },
    { name: "Drafting Agent", status: "Compiling document iteration...", desc: "Synthesizing raw notes into academic-grade prose." },
    { name: "Citation Agent", status: "Normalizing BibTeX references...", desc: "Ensuring every claim is backed by verifiable DOI/ArXiv links." },
    { name: "Style Agent", status: "Applying LaTeX themes...", desc: "Formatting document to professional publication standards." },
    { name: "Final Review Agent", status: "Deterministic audit in progress...", desc: "Performing final security check and data isolation verification." }
];

export function SynthesisAnimation() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % agents.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="p-8 md:p-12 border border-ink bg-ink text-paper shadow-[12px_12px_0_var(--amber)] min-h-[320px] flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-amber animate-pulse" />
                        <div>
                            <div className="font-mono text-[10px] tracking-[0.2em] text-paper/40 uppercase">Synthesis Engine</div>
                            <div className="font-mono text-[11px] text-amber">PIPELINE ACTIVE</div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                            <motion.div 
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                className="w-1 h-1 bg-amber rounded-full"
                            />
                        ))}
                    </div>
                </div>

                <div className="relative h-24 overflow-hidden mb-8 border-l border-paper/10 pl-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5, ease: "anticipate" }}
                            className="absolute inset-0 flex flex-col justify-center"
                        >
                            <h4 className="font-serif text-2xl font-bold text-amber mb-2 tracking-tight">
                                {agents[index].name}
                            </h4>
                            <div className="flex items-center gap-2 mb-3">
                                <Loader2 className="w-3 h-3 animate-spin text-paper/60" />
                                <span className="font-mono text-[10px] text-paper/60 uppercase tracking-widest">
                                    {agents[index].status}
                                </span>
                            </div>
                            <p className="font-mono text-[11px] text-paper/40 max-w-xs leading-relaxed italic">
                                {agents[index].desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                    {agents.map((_, i) => (
                        <div key={i} className="relative h-1.5 bg-paper/10 rounded-full overflow-hidden">
                            <motion.div 
                                initial={false}
                                animate={{ 
                                    width: i < index ? "100%" : i === index ? "100%" : "0%",
                                    backgroundColor: i < index ? "var(--paper)" : i === index ? "var(--amber)" : "rgba(255,255,255,0.1)"
                                }}
                                className="absolute inset-0"
                            />
                            {i === index && (
                                <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-0 bg-white blur-sm opacity-50"
                                />
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-[0.2em]">
                    <span className="text-paper/30">Input Layer</span>
                    <span className="text-amber">Agent {index + 1}/7</span>
                    <span className="text-paper/30">Output PDF</span>
                </div>
            </div>
        </div>
    );
}
