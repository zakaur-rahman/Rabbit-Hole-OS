"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const features = [
    {
        title: "Agentic Synthesis",
        desc: "7 specialized AI agents collaborate to plan, write, and review your research into publication-ready PDF documents.",
        category: "01 / PIPELINE",
        className: "md:col-span-2"
    },
    {
        title: "Visual Discovery",
        desc: "Map your research graph. Navigate the web in 2D and capture every connection as a node.",
        category: "02 / GRAPH",
        className: "md:col-span-1"
    },
    {
        title: "Academic Grounding",
        desc: "Automatic ArXiv, DOI, and BibTeX normalization ensures every claim is verified and cited.",
        category: "03 / AUTHENTICITY",
        className: "md:col-span-1"
    },
    {
        title: "Local-First Intelligence",
        desc: "Run on your terms. Data isolation and deterministic caching ensure privacy and speed.",
        category: "04 / ARCHITECTURE",
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
                    <h2 className="font-serif text-[clamp(36px,5vw,70px)] font-black leading-none tracking-tighter mb-8">
                        Knowledge Made <em className="italic font-normal">Verifiable</em>
                    </h2>
                    <a 
                        href="/features" 
                        className="text-mid text-[10px] tracking-[0.15em] uppercase no-underline font-mono border-b border-rule pb-0.5 hover:text-ink hover:border-ink transition-colors"
                    >
                        Explore our full Feature Set →
                    </a>
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
