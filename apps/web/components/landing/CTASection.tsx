"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface CTASectionProps {
    title?: React.ReactNode;
    subtitle?: string;
    primaryButtonText?: string;
    primaryButtonHref?: string;
    secondaryButtonText?: string;
    secondaryButtonHref?: string;
}

interface NodePosition {
    left: string;
    top: string;
    offsetX: number;
    offsetY: number;
    duration: number;
}

export function CTASection({
    title = <>Start Building <br /> <em className="text-amber font-normal italic">Connected Ideas</em></>,
    subtitle = "Join a community of researchers who are redefining what it means to build a second brain.",
    primaryButtonText = "Get Started",
    primaryButtonHref = "/download",
    secondaryButtonText = "How It Works",
    secondaryButtonHref = "/how-it-works"
}: CTASectionProps) {
    const [nodes, setNodes] = useState<NodePosition[]>([]);

    useEffect(() => {
        // Only generate random positions after mounting on the client
        const newNodes = [...Array(6)].map((_, i) => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            offsetX: Math.random() * 50 - 25,
            offsetY: Math.random() * 50 - 25,
            duration: 5 + i
        }));
        setNodes(newNodes);
    }, []);

    return (
        <section className="py-32 px-8 md:px-12 bg-paper relative overflow-hidden">
            {/* Background Elite Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <div className="grid grid-cols-6 h-full w-full">
                    {[...Array(24)].map((_, i) => (
                        <div key={i} className="border-[0.5px] border-ink" />
                    ))}
                </div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-ink p-12 md:p-24 border border-ink shadow-[32px_32px_0_var(--faint)] text-paper relative group overflow-hidden"
                >
                    {/* Animated Background Nodes */}
                    <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                        {nodes.map((node, i) => (
                            <motion.div
                                key={i}
                                animate={{ 
                                    x: [0, node.offsetX],
                                    y: [0, node.offsetY],
                                    opacity: [0.1, 0.3, 0.1]
                                }}
                                transition={{ repeat: Infinity, duration: node.duration, ease: "easeInOut" }}
                                className="absolute w-1 h-1 bg-amber rounded-full"
                                style={{ 
                                    left: node.left, 
                                    top: node.top 
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10 text-center flex flex-col items-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-12 h-12 border border-paper/20 rounded-full flex items-center justify-center mb-10 group-hover:border-amber transition-colors"
                        >
                            <div className="w-2 h-2 bg-amber rounded-full shadow-[0_0_10px_var(--amber)]" />
                        </motion.div>

                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="font-serif text-5xl md:text-8xl font-black mb-10 tracking-tighter leading-none"
                        >
                            {title}
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-paper/60 text-[14px] md:text-[16px] max-w-lg mb-12 font-mono leading-relaxed"
                        >
                            {subtitle}
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto"
                        >
                            <Link href={primaryButtonHref} className="w-full md:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02, x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full md:w-auto px-12 py-5 bg-amber text-ink font-mono text-[12px] tracking-[0.2em] uppercase font-black hover:bg-white transition-all flex items-center justify-center gap-3 shadow-xl"
                                >
                                    {primaryButtonText}
                                    <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>

                            <Link href={secondaryButtonHref} className="w-full md:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02, borderColor: "var(--amber)", color: "var(--amber)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full md:w-auto px-12 py-5 bg-transparent border border-paper/20 text-paper/80 font-mono text-[12px] tracking-[0.2em] uppercase hover:text-paper transition-all"
                                >
                                    {secondaryButtonText}
                                </motion.button>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Corner accents */}
                    <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-amber/20 translate-x-12 -translate-y-12" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 border-b border-l border-amber/20 -translate-x-12 translate-y-12" />
                </motion.div>
            </div>

            {/* Bottom visual sweep */}
            <div className="absolute bottom-0 left-0 w-full h-[30%] bg-cream -z-10 translate-y-1/2 -skew-y-3" />
        </section>
    );
}
