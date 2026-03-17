"use client";

import { motion } from "framer-motion";
import { 
    Zap, 
    Link as LinkIcon, 
    Shield, 
    Cpu, 
    Shapes, 
    BrainCircuit
} from "lucide-react";
import Link from "next/link";

import { AnimatedSection } from "@/components/features/AnimatedSection";
import { FeatureCard } from "@/components/features/FeatureCard";
import { NodeGraphDemo } from "@/components/features/NodeGraphDemo";
import { WorkflowVisualization } from "@/components/features/WorkflowVisualization";
import { UseCaseCard } from "@/components/features/UseCaseCard";
import { CTASection } from "@/components/landing/CTASection";

export default function FeaturesPage() {
    return (
        <div className="bg-paper text-ink min-h-screen">
            {/* HERO SECTION */}
            <section className="relative pt-40 pb-32 px-8 md:px-12 overflow-hidden border-b border-rule">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                    <div>
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 mb-8"
                        >
                            <div className="w-12 h-12 border-[1.5px] border-ink grid place-items-center">
                                <div className="w-4 h-4 bg-amber rounded-full animate-pulse" />
                            </div>
                            <span className="font-mono text-[12px] tracking-[0.3em] uppercase text-amber font-bold">Capabilities</span>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="font-serif text-[clamp(44px,7vw,90px)] font-black leading-none tracking-tighter mb-10"
                        >
                            Powerful Features for <br />
                            <em className="italic font-normal text-amber">Connected</em> Thinking
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-mid text-[18px] max-w-xl leading-relaxed font-mono border-l-4 border-amber pl-8 py-2"
                        >
                            Cognode enables you to structure ideas visually, connect knowledge, and build intelligent workflows using a node-based graph system.
                        </motion.p>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 1 }}
                        className="relative"
                    >
                        <NodeGraphDemo />
                    </motion.div>
                </div>
                
                {/* Visual texture */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-cream -z-10 translate-x-1/2 -skew-x-12 border-l border-rule" />
            </section>

            {/* CORE FEATURES GRID */}
            <section className="py-32 px-8 md:px-12 max-w-7xl mx-auto">
                <AnimatedSection className="mb-24 text-center">
                    <h2 className="font-serif text-5xl md:text-7xl font-black mb-8 tracking-tighter">The Operating System <br /> of Logic</h2>
                    <p className="font-mono text-mid text-[14px] max-w-2xl mx-auto">
                        We built Cognode to handle the mess of modern research. Every feature is designed to move you from fragmentation to cohesion.
                    </p>
                </AnimatedSection>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard 
                        title="Visual Node Graph"
                        description="Navigate your research in a 2D spatial environment. Map sources, notes, and PDF annotations as interconnected nodes."
                        useCase="Literature review for post-doc journals."
                        technical="REACTFLOW + CUSTOM CANVAS ENGINE"
                        icon={<Shapes className="w-6 h-6" />}
                    />
                    <FeatureCard 
                        title="AI-Assisted Idea Mapping"
                        description="Our agents observe your graph and suggest hidden semantic connections between disparate research nodes."
                        useCase="Identifying gaps in project requirements."
                        technical="LLM EMBEDDING + GRAPH ANALYSIS"
                        icon={<BrainCircuit className="w-6 h-6" />}
                        className="lg:translate-y-8"
                    />
                    <FeatureCard 
                        title="7-Agent Synthesis"
                        description="Trigger an autonomous pipeline that plans, cross-checks, and writes your document with academic precision."
                        useCase="Generating first-draft research papers."
                        technical="ASYNC MULTI-AGENT STATE MACHINE"
                        icon={<Cpu className="w-6 h-6" />}
                    />
                    <FeatureCard 
                        title="Connected System"
                        description="A unified data layer that preserves the lineage of every idea, from raw URL to final citation."
                        useCase="Patent application tracing."
                        technical="SQLITE + DETERMINISTIC UUID MAPPING"
                        icon={<LinkIcon className="w-6 h-6" />}
                    />
                    <FeatureCard 
                        title="Workflow Automation"
                        description="Define custom nodes that trigger external API calls, PDF exports, or vector database syncing."
                        useCase="CI/CD for knowledge repositories."
                        technical="NODE-BASED TASK EXECUTION"
                        icon={<Zap className="w-6 h-6" />}
                        className="lg:translate-y-8"
                    />
                    <FeatureCard 
                        title="Deterministic Privacy"
                        description="Everything, including the AI synthesis, is designed with local-first isolation and secure agent auditing."
                        useCase="Corporate R&D and secure planning."
                        technical="LOCAL-FIRST SECURE ENCLAVE MODEL"
                        icon={<Shield className="w-6 h-6" />}
                    />
                </div>
            </section>

            {/* WORKFLOW VISUALIZATION */}
            <section className="py-32 bg-cream border-y border-rule px-8 md:px-12">
                <div className="max-w-7xl mx-auto text-center">
                    <AnimatedSection>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-4 block">The Pipeline</span>
                        <h2 className="font-serif text-5xl md:text-6xl font-black mb-16 tracking-tighter">Fragmented Web → <em className="font-normal italic">Structured Knowledge</em></h2>
                        <WorkflowVisualization />
                    </AnimatedSection>
                </div>
            </section>

            {/* USE CASES */}
            <section className="py-32 px-8 md:px-12 max-w-7xl mx-auto">
                <AnimatedSection className="mb-24">
                    <h2 className="font-serif text-5xl md:text-7xl font-black mb-12 tracking-tighter text-center md:text-left">Built for the <br /> <em className="italic font-normal text-amber">Hard Problems</em></h2>
                </AnimatedSection>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <UseCaseCard 
                        title="For Founders"
                        description="Cognode acts as the strategic brain for your company. Map competitor landscapes, track internal R&D, and synthesize pitch decks from raw founder notes."
                        workflow={["Capture market signals", "Map competitor nodes", "Synthesize strategy paper"]}
                    />
                    <UseCaseCard 
                        title="For AI Builders"
                        description="Visualize your agent memory banks. Use Cognode as a visual debugger for complex RAG systems and multi-agent workflows."
                        workflow={["Audit agent memory", "Visualize thought trees", "Debug node failures"]}
                    />
                    <UseCaseCard 
                        title="For Researchers"
                        description="Stop losing context in browser tabs. Turn your deep-dives into structured academic papers with verifiable citation lineage."
                        workflow={["Capture ArXiv sources", "Connect semantic links", "Export to LaTeX PDF"]}
                    />
                    <UseCaseCard 
                        title="For Technical Writers"
                        description="Build complex documentation as a graph. See the relationships between modules and generate cohesive guides automatically."
                        workflow={["Map code architecture", "Outline module nodes", "Publish unified docs"]}
                    />
                </div>
            </section>

            {/* CTA SECTION */}
            <CTASection 
                secondaryButtonText="How It Works"
                secondaryButtonHref="/how-it-works"
            />

            {/* Accessibility / SEO Meta tags (simplified representation) */}
            <footer className="py-12 px-8 md:px-12 max-w-7xl mx-auto border-t border-rule/30 flex justify-between items-center opacity-50">
                <p className="font-mono text-[11px] uppercase tracking-widest text-mid">© 2026 Cognode Laboratory — All Systems Nominal</p>
                <div className="flex gap-8 font-mono text-[11px] uppercase tracking-widest text-mid">
                    <Link href="/terms" className="hover:text-amber transition-colors">Terms</Link>
                    <Link href="/privacy" className="hover:text-amber transition-colors">Privacy</Link>
                </div>
            </footer>
        </div>
    );
}
