"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function Privacy() {
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById('privacy');
            if (el && el.getBoundingClientRect().top < window.innerHeight * 0.8) {
                setVis(true);
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section id="privacy" className="px-12 py-32 bg-paper relative z-10 border-b border-rule grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className={cn("opacity-0 -translate-x-8 transition-all duration-800", vis && "opacity-100 translate-x-0")}>
                <span className="text-[10px] tracking-[0.2em] uppercase text-amber mb-6 block font-mono">Data Integrity</span>
                <h2 className="font-serif text-[clamp(36px,5vw,60px)] font-black leading-none tracking-tighter mb-8">
                    Your Thoughts,<br />
                    Stay <em className="italic font-normal">Yours</em>
                </h2>
                <p className="text-mid text-[14px] leading-[1.9] max-w-[420px] font-mono mb-8">
                    Cognode is built on the principle of local-first software. We never see your data, and we don&apos;t want to. No trackers, no telemetry, no cloud lock-in. Just your files, on your machine.
                </p>
                <a 
                    href="/privacy" 
                    className="text-amber text-[10px] tracking-[0.15em] uppercase no-underline font-mono border-b border-amber pb-0.5 hover:text-ink hover:border-ink transition-colors"
                >
                    Review our full Security Protocol
                </a>
            </div>

            <div className={cn("border border-rule bg-cream p-12 shadow-[12px_12px_0_var(--faint)] opacity-0 translate-x-8 transition-all duration-800", vis && "opacity-100 translate-x-0")}>
                <div className="flex flex-col gap-6">
                    <div className="flex gap-4 items-start">
                        <div className="w-6 h-6 border border-amber flex items-center justify-center shrink-0 mt-1">
                            <div className="w-2 h-2 bg-amber" />
                        </div>
                        <div>
                            <span className="text-ink font-serif text-[18px] font-bold block mb-1">SQLite Driven</span>
                            <span className="text-mid text-[11px] font-mono leading-relaxed">High performance graph queries running directly on your disk.</span>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="w-6 h-6 border border-amber flex items-center justify-center shrink-0 mt-1">
                            <div className="w-2 h-2 bg-amber" />
                        </div>
                        <div>
                            <span className="text-ink font-serif text-[18px] font-bold block mb-1">Markdown Native</span>
                            <span className="text-mid text-[11px] font-mono leading-relaxed">Human-readable files that outlive any application.</span>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="w-6 h-6 border border-amber flex items-center justify-center shrink-0 mt-1">
                            <div className="w-2 h-2 bg-amber" />
                        </div>
                        <div>
                            <span className="text-ink font-serif text-[18px] font-bold block mb-1">Zero Cloud</span>
                            <span className="text-mid text-[11px] font-mono leading-relaxed">Works 100% offline. Perfect for sensitive research and deep work.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
