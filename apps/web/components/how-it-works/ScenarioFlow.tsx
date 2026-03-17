"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Search, Code, CheckCircle } from "lucide-react";

export function ScenarioFlow() {
    const steps = [
        { icon: <Lightbulb />, label: "Idea", color: "bg-cream" },
        { icon: <Search />, label: "Research", color: "bg-cream" },
        { icon: <Code />, label: "Planning", color: "bg-amber" },
        { icon: <CheckCircle />, label: "Execution", color: "bg-ink", textColor: "text-white" }
    ];

    return (
        <div className="py-20 bg-cream border border-rule shadow-[16px_16px_0_var(--faint)]">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 px-10">
                {steps.map((step, i) => (
                    <div key={i} className="flex flex-col md:flex-row items-center gap-6">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.2 }}
                            className={`w-24 h-24 border border-ink ${step.color} grid place-items-center relative shadow-[6px_6px_0_var(--rule)]`}
                        >
                            <div className={`${step.textColor || "text-ink"}`}>
                                {step.icon}
                            </div>
                            <span className={`absolute -bottom-8 font-mono text-[10px] uppercase tracking-widest ${step.textColor || "text-ink"}`}>{step.label}</span>
                        </motion.div>
                        
                        {i < steps.length - 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.2 + 0.1 }}
                                className="rotate-90 md:rotate-0"
                            >
                                <ArrowRight className="w-6 h-6 text-amber" />
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
