"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UseCaseCardProps {
    title: string;
    description: string;
    workflow: string[];
    className?: string;
}

export function UseCaseCard({ title, description, workflow, className }: UseCaseCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
                "p-10 border border-rule bg-paper shadow-[10px_10px_0_rgba(0,0,0,0.03)] h-full flex flex-col group transition-all hover:bg-white",
                className
            )}
        >
            <h3 className="font-serif text-3xl font-black mb-6 tracking-tight group-hover:text-amber transition-colors">
                {title}
            </h3>
            <p className="font-mono text-[13px] text-mid leading-relaxed mb-10 flex-1">
                {description}
            </p>
            
            <div className="space-y-3 pt-6 border-t border-rule italic">
                <span className="font-mono text-[9px] uppercase tracking-widest text-amber block mb-2">Primary Loop</span>
                {workflow.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-amber rounded-full shrink-0" />
                        <span className="font-mono text-[11px] text-ink">{item}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
