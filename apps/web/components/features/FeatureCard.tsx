"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
    title: string;
    description: string;
    useCase: string;
    technical: string;
    icon: ReactNode;
    className?: string;
}

export function FeatureCard({ title, description, useCase, technical, icon, className }: FeatureCardProps) {
    return (
        <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
                "group relative bg-white border border-rule p-8 md:p-10 flex flex-col h-full shadow-[8px_8px_0_var(--faint)] hover:shadow-[16px_16px_0_var(--faint)] transition-all",
                className
            )}
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full pointer-events-none" />
            
            <div className="w-12 h-12 border border-rule bg-cream grid place-items-center mb-8 group-hover:bg-amber group-hover:border-ink transition-colors duration-500">
                <div className="text-ink group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>

            <h3 className="font-serif text-2xl font-bold mb-4 tracking-tight group-hover:text-amber transition-colors">
                {title}
            </h3>
            
            <p className="font-mono text-[13px] text-mid leading-relaxed mb-8 flex-1">
                {description}
            </p>

            <div className="space-y-4 pt-6 border-t border-rule/50">
                <div className="flex items-start gap-4">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber mt-1 shrink-0">Use Case</span>
                    <p className="font-mono text-[11px] text-ink italic leading-snug">{useCase}</p>
                </div>
                <div className="flex items-start gap-4">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-mid mt-1 shrink-0">Engine</span>
                    <p className="font-mono text-[10px] text-mid/70 leading-snug uppercase tracking-tighter">{technical}</p>
                </div>
            </div>
        </motion.div>
    );
}
