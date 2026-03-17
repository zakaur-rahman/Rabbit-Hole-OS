"use client";

import { motion } from "framer-motion";
import { Share2, Workflow, Cpu, ShieldCheck } from "lucide-react";

import { AnimatedSection } from "@/components/features/AnimatedSection";
import { WorkflowStep } from "@/components/how-it-works/WorkflowStep";
import { GraphVisual } from "@/components/how-it-works/GraphVisual";
import { ScenarioFlow } from "@/components/how-it-works/ScenarioFlow";
import { SynthesisAnimation } from "@/components/how-it-works/SynthesisAnimation";
import { CaptureAnimation } from "@/components/how-it-works/CaptureAnimation";
import { DiscoveryAnimation } from "@/components/how-it-works/DiscoveryAnimation";
import { CTASection } from "@/components/landing/CTASection";

export default function HowItWorksPage() {
    return (
        <div className="bg-paper text-ink min-h-screen">
            {/* HERO INTRODUCTION */}
            <section className="relative pt-40 pb-24 px-8 md:px-12 overflow-hidden border-b border-rule">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-[12px] tracking-[0.3em] uppercase text-amber font-black mb-8 block"
                    >
                        Foundation & Flow
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="font-serif text-6xl md:text-8xl font-black leading-tight tracking-tighter mb-10"
                    >
                        How <em className="italic font-normal text-amber">Cognode</em> Works
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-mid text-[18px] md:text-[20px] max-w-2xl mx-auto leading-relaxed font-mono"
                    >
                        Understand how Cognode transforms fragmented ideas into connected knowledge graphs and intelligent workflows.
                    </motion.p>
                </div>

                {/* Animated Background nodes */}
                <div className="absolute inset-0 -z-10 pointer-events-none opacity-20">
                    <div className="absolute top-1/4 left-1/4 w-px h-64 bg-rule rotate-45" />
                    <div className="absolute bottom-1/4 right-1/4 w-px h-64 bg-amber -rotate-12" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-px bg-rule/50" />
                </div>
            </section>

            {/* STEP-BY-STEP WORKFLOW */}
            <section className="py-24 px-8 md:px-12 max-w-7xl mx-auto">
                <WorkflowStep 
                    number="01"
                    title="Capture Ideas"
                    description="Snap disparate web sources, PDF fragments, or handwritten notes into persistent graph nodes. Cognode is built to hold the mess of raw research."
                    visual={<CaptureAnimation />}
                />

                <WorkflowStep 
                    number="02"
                    title="Connect Knowledge"
                    description="Drag edges between nodes to define semantic relationships. Cognitive mapping turns a collection of facts into a system of understanding."
                    visual={<GraphVisual />}
                    className="lg:flex-row-reverse text-right lg:text-left"
                />

                <WorkflowStep 
                    number="03"
                    title="Build a Graph"
                    description="Navigate your growing knowledge base spatially. See the structure of your logic as it emerges from the connections."
                    visual={<DiscoveryAnimation />}
                />

                <WorkflowStep 
                    number="04"
                    title="Execute with AI"
                    description="Trigger the 7-agent pipeline to reason across your graph. Move from research to synthesis with autonomous auditing and drafting."
                    visual={<SynthesisAnimation />}
                    className="lg:flex-row-reverse text-right lg:text-left"
                />
            </section>

            {/* SCENARIO SECTION */}
            <section className="py-32 bg-cream/50 border-y border-rule px-8 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <AnimatedSection className="text-center mb-20">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-4 block">Case Study</span>
                        <h2 className="font-serif text-5xl md:text-6xl font-black mb-8 tracking-tighter">Idea → <em className="italic font-normal text-amber">Draft</em> in one flow.</h2>
                        <p className="font-mono text-[14px] text-mid max-w-xl mx-auto leading-relaxed">
                            See how a technical founder uses Cognode to turn a market research rabbit hole into a structured feature roadmap.
                        </p>
                    </AnimatedSection>
                    
                    <AnimatedSection>
                        <ScenarioFlow />
                    </AnimatedSection>
                </div>
            </section>

            {/* KEY SYSTEM CAPABILITIES */}
            <section className="py-32 px-8 md:px-12 max-w-7xl mx-auto">
                <AnimatedSection className="mb-20">
                    <h2 className="font-serif text-5xl md:text-7xl font-black mb-6 tracking-tighter">System Architecture</h2>
                </AnimatedSection>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: "Node Engine", desc: "Infinite canvas for non-linear thinking.", icon: <Workflow /> },
                        { title: "Semantic Linker", desc: "Automated connection discovery.", icon: <Share2 /> },
                        { title: "Agentic Loop", desc: "7-step synthesis pipeline.", icon: <Cpu /> },
                        { title: "Secure Vault", desc: "Local-first data isolation.", icon: <ShieldCheck /> }
                    ].map((cap, i) => (
                        <motion.div 
                            key={i}
                            whileHover={{ y: -5 }}
                            className="p-8 border border-rule bg-white shadow-[8px_8px_0_rgba(0,0,0,0.03)] hover:shadow-[12px_12px_0_var(--faint)] transition-all group"
                        >
                            <div className="w-10 h-10 border border-rule bg-cream grid place-items-center text-ink mb-6 group-hover:bg-amber group-hover:border-ink transition-colors">
                                {cap.icon}
                            </div>
                            <h4 className="font-serif text-xl font-black mb-3">{cap.title}</h4>
                            <p className="font-mono text-[12px] text-mid leading-relaxed">{cap.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA SECTION */}
            <CTASection 
                title={<>Start Building <br /> <em className="text-amber font-normal italic">Logic</em></>}
                secondaryButtonText="Explore Features"
                secondaryButtonHref="/features"
            />
        </div>
    );
}
