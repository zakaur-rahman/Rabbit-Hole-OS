"use client";

import { motion } from "framer-motion";
import { BookOpen, Share2, Cpu, FileText } from "lucide-react";

const workflowSteps = [
    { title: "Capture", icon: <BookOpen className="w-5 h-5" />, desc: "Snap disparate web sources into graph nodes." },
    { title: "Connect", icon: <Share2 className="w-5 h-5" />, desc: "Define relationships and map the research terrain." },
    { title: "Reason", icon: <Cpu className="w-5 h-5" />, desc: "7 agents debate and synthesize the evidence." },
    { title: "Publish", icon: <FileText className="w-5 h-5" />, desc: "LaTeX-grade PDF generated automatically." },
];

export function WorkflowVisualization() {
    return (
        <div className="relative py-20 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10 text-center">
                {workflowSteps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="relative"
                    >
                        <div className="w-16 h-16 border border-rule bg-white mx-auto mb-8 grid place-items-center shadow-[6px_6px_0_var(--faint)] relative z-10 group-hover:shadow-[8px_8px_0_var(--faint)] transition-all">
                            <div className="text-amber">{step.icon}</div>
                        </div>
                        <h4 className="font-serif text-xl font-bold mb-3">{step.title}</h4>
                        <p className="font-mono text-[11px] text-mid leading-relaxed px-4">{step.desc}</p>

                        {/* Animated Line Connector */}
                        {i < workflowSteps.length - 1 && (
                            <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-rule">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    transition={{ duration: 1, delay: i * 0.15 + 0.5 }}
                                    className="absolute inset-0 bg-amber origin-left"
                                />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
            
            {/* Background Texture */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-rule/30 -z-10" />
        </div>
    );
}
