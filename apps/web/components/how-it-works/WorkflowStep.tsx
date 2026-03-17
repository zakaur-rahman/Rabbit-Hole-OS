"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkflowStepProps {
    number: string;
    title: string;
    description: string;
    visual: ReactNode;
    className?: string;
}

export function WorkflowStep({ number, title, description, visual, className }: WorkflowStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className={cn(
                "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 border-b border-rule last:border-0",
                className
            )}
        >
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-ink bg-amber text-ink font-mono font-bold grid place-items-center shadow-[4px_4px_0_var(--faint)]">
                        {number}
                    </div>
                </div>
                <h3 className="font-serif text-4xl md:text-5xl font-black leading-tight tracking-tighter">
                    {title}
                </h3>
                <p className="font-mono text-mid text-[16px] leading-relaxed max-w-lg italic">
                    {description}
                </p>
            </div>
            <div className="relative">
                {visual}
            </div>
        </motion.div>
    );
}
