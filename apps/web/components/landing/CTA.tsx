"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function CTA() {
    const [vis, setVis] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById('cta');
            if (el && el.getBoundingClientRect().top < window.innerHeight * 0.9) {
                setVis(true);
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section id="cta" className="px-12 py-40 bg-cream text-center border-b border-rule relative overflow-hidden">
            <div className={cn("relative z-10 opacity-0 scale-95 transition-all duration-1000", vis && "opacity-100 scale-100")}>
                <h2 className="font-serif text-[clamp(40px,7vw,100px)] font-black italic tracking-tighter mb-10 leading-tight">
                    Start Mapping Your<br />
                    Knowledge Today
                </h2>
                
                <div className="flex flex-col items-center gap-6">
                    <Link 
                        href="/download" 
                        className="bg-ink text-paper px-[50px] py-[18px] text-[13px] tracking-[0.2em] uppercase no-underline transition-all hover:bg-amber hover:text-ink font-mono"
                    >
                        Download v1.0
                    </Link>
                    <span className="text-mid text-[10px] tracking-[0.1em] uppercase font-mono">
                        Available for macOS & Windows — Build: 2024.1
                    </span>
                </div>
            </div>

            {/* Decorative background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-rule/30 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-rule/20 rounded-full pointer-events-none" />
        </section>
    );
}
