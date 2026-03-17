"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CognodeLogo } from "../ui/CognodeLogo";

export function AboutContent() {
    return (
        <div className="pt-32 pb-24 px-8 md:px-12 max-w-4xl mx-auto">
            <header className="mb-24">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <CognodeLogo className="w-10 h-10 text-ink" />
                    <span className="font-mono text-[12px] tracking-[0.2em] uppercase text-amber font-bold">Our Philosophy</span>
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-serif text-5xl md:text-7xl mb-12 leading-[1.1]"
                >
                    Built for the <br /> nonlinear mind.
                </motion.h1>
                
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-ink text-[18px] leading-relaxed font-serif italic border-l-4 border-amber pl-8 py-2"
                >
                    &quot;The human mind does not operate in folders. It operates in patterns, connections, and sudden leaps of intuition.&quot;
                </motion.p>
            </header>

            <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="prose prose-ink max-w-none"
            >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 mb-24">
                    <h2 className="font-serif text-2xl uppercase tracking-tighter text-amber">The Vision</h2>
                    <div className="font-mono text-[14px] text-mid leading-loose space-y-6">
                        <p>
                            Cognode was born out of a simple frustration: existing research tools are essentially glorified filing cabinets. They force you to categorize your ideas before you even understand them.
                        </p>
                        <p>
                            We believe that research is a process of discovery, not just documentation. It starts with a &quot;rabbit hole&quot;&mdash;a single link that leads to another, then another, until a complex web of information begins to emerge.
                        </p>
                        <p>
                            Cognode is the operating system for that process. It provides the visual space to map those connections and the agentic intelligence to synthesize them into structured knowledge.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 mb-24">
                    <h2 className="font-serif text-2xl uppercase tracking-tighter text-amber">Why Connected?</h2>
                    <div className="font-mono text-[14px] text-mid leading-loose space-y-6">
                        <p>
                            In a world of information overflow, the value isn&apos;t in the data itself, but in how pieces of data relate to one another. Cognode treats links, references, and citations as first-class citizens.
                        </p>
                        <p>
                            By visualizing your research as a graph, you&apos;re not just storing information; you&apos;re building a mental model. This visual scaffolding allows our AI agents to &quot;see&quot; what you see, enabling a level of synthesis that traditional LLM interfaces can&apos;t match.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">
                    <h2 className="font-serif text-2xl uppercase tracking-tighter text-amber">The Mission</h2>
                    <div className="font-mono text-[14px] text-mid leading-loose space-y-6">
                        <p>
                            Our mission is to bridge the gap between fragmented web exploration and academic-grade publication. We want to empower researchers, developers, and founders to turn their curiosity into comprehensive, peer-ready research papers with unprecedented speed and depth.
                        </p>
                        <p>
                            Cognode isn&apos;t just a tool; it&apos;s a partner in the pursuit of understanding.
                        </p>
                    </div>
                </div>
            </motion.section>

            <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-32 pt-20 border-t border-rule"
            >
                <div className="bg-cream p-12 border border-rule transition-all hover:border-amber group">
                    <h3 className="font-serif text-3xl mb-6 group-hover:text-amber transition-colors text-center">Ready to dive in?</h3>
                    <p className="text-mid text-[14px] font-mono mb-8 text-center max-w-lg mx-auto">
                        Join a community of researchers who are redefining what it means to build a second brain.
                    </p>
                    <div className="flex justify-center">
                        <Link href="/download">
                            <button className="bg-ink text-paper px-10 py-4 font-mono text-[12px] tracking-[0.2em] uppercase transition-all hover:bg-amber hover:text-ink">
                                Download Cognode v1.0
                            </button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
