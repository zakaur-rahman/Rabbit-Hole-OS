"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const features = [
    {
        title: "Semantic Graph",
        desc: "AI-driven connections between your notes. Build a living map of your research.",
        category: "01 / ARCHITECTURE",
        className: "md:col-span-2"
    },
    {
        title: "Privacy First",
        desc: "Everything runs locally. Your data never leaves your machine.",
        category: "02 / INTEGRITY",
        className: "md:col-span-1"
    },
    {
        title: "Multi-Source Ingestion",
        desc: "Markdown, PDF, HTML. Ingest anything and connect it to everything.",
        category: "03 / INPUT",
        className: "md:col-span-1"
    },
    {
        title: "Customizable Nodes",
        desc: "Color-code and categorize your knowledge nodes for maximum clarity.",
        category: "04 / STYLE",
        className: "md:col-span-2"
    }
];

export function Features() {
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById('features');
            if (el && el.getBoundingClientRect().top < window.innerHeight * 0.8) {
                setVis(true);
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section id="features" className="px-12 py-32 bg-paper relative z-10 border-b border-rule overflow-hidden">
            <div className={cn("flex flex-col md:flex-row justify-between items-end gap-8 mb-20 opacity-0 translate-y-6 transition-all duration-800", vis && "opacity-100 translate-y-0")}>
                <div className="max-w-2xl">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-amber mb-4 block font-mono">Core Capabilities</span>
                    <h2 className="font-serif text-[clamp(36px,5vw,70px)] font-black leading-[1.0] tracking-tighter">
                        Knowledge Made <em className="italic font-normal">Verifiable</em>
                    </h2>
                </div>
                <p className="text-mid text-[13px] leading-[1.8] max-w-[320px] font-mono">
                    The operating system for your second brain. Built for researchers, by researchers.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {features.map((f, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "border border-rule bg-white p-10 flex flex-col justify-between min-h-[300px] shadow-[8px_8px_0_var(--faint)] transition-all hover:shadow-[12px_12px_0_var(--faint)] hover:-translate-y-1 opacity-0 translate-y-8 transition-all duration-800 delay-[calc(i*100ms)]",
                            f.className,
                            vis && "opacity-100 translate-y-0"
                        )}
                        style={{ transitionDelay: `${i * 150}ms` }}
                    >
                        <span className="text-[10px] tracking-[0.14em] uppercase text-mid font-mono block mb-12">{f.category}</span>
                        <div>
                            <h3 className="font-serif text-[28px] font-bold leading-tight mb-4 tracking-tight">{f.title}</h3>
                            <p className="text-mid text-[13px] leading-[1.7] max-w-[280px] font-mono">{f.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
