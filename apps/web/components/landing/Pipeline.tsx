"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const steps = [
    { title: "Capture", desc: "Browse the web and snap sources directly into your graph." },
    { title: "Structure", desc: "Organize nodes and define relationships to guide AI reasoning." },
    { title: "Synthesize", desc: "7 autonomous agents collaborate to build your research paper." },
    { title: "Publish", desc: "Compile to professional, academic-grade PDF via LaTeX." }
];

export function Pipeline() {
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById('pipeline');
            if (el && el.getBoundingClientRect().top < window.innerHeight * 0.8) {
                setVis(true);
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section id="pipeline" className="px-12 py-32 bg-cream relative z-10 border-b border-rule">
            <div className={cn("text-center mb-24 opacity-0 translate-y-6 transition-all duration-800", vis && "opacity-100 translate-y-0")}>
                <span className="text-[10px] tracking-[0.2em] uppercase text-amber mb-4 block font-mono">The Workflow</span>
                <h2 className="font-serif text-[clamp(36px,5vw,70px)] font-black tracking-tighter mb-8">
                    A Simple <em className="italic font-normal">Pipeline</em>
                </h2>
                <a 
                    href="/how-it-works" 
                    className="text-ink text-[10px] tracking-[0.15em] uppercase no-underline font-mono border-b border-rule pb-0.5 hover:text-amber hover:border-amber transition-colors"
                >
                    Deep dive into building logic →
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                {steps.map((step, i) => (
                    <div key={i} className="relative group">
                        <div className={cn(
                            "p-10 border border-rule bg-white shadow-[6px_6px_0_var(--faint)] opacity-0 translate-y-8 transition-all duration-700",
                            vis && "opacity-100 translate-y-0"
                        )} style={{ transitionDelay: `${i * 150}ms` }}>
                            <span className="font-serif italic text-[24px] text-amber mb-6 block">0{i+1}</span>
                            <h3 className="font-serif text-[22px] font-bold mb-3 tracking-tight">{step.title}</h3>
                            <p className="text-mid text-[12px] leading-[1.7] font-mono">{step.desc}</p>
                        </div>
                        {i < 3 && (
                            <div className={cn(
                                "hidden md:block absolute top-1/2 -right-4 translate-x-1/2 -translate-y-1/2 z-20 opacity-0 transition-all duration-700 delay-800",
                                vis && "opacity-100"
                            )}>
                                <span className="text-amber text-[24px]">→</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
