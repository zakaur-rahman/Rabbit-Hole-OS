"use client";

import React from 'react';

const fileTypes = ["PDF", "MARKDOWN", "HTML", "BIBTEX", "JSON", "DOCX", "LATEX", "PANDOC", "IMAGE", "VIDEO"];

export function Marquee() {
    return (
        <div className="border-y border-rule py-4 overflow-hidden bg-cream relative z-10">
            <div className="flex animate-[marquee_25s_linear_infinite] whitespace-nowrap gap-12 group-hover:[animation-play-state:paused]">
                {[...fileTypes, ...fileTypes, ...fileTypes].map((type, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <span className="font-serif italic text-[11px] text-mid">ingest</span>
                        <span className="font-mono text-ink text-[11px] tracking-[0.2em] uppercase font-medium">{type}</span>
                        <div className="w-1 h-1 bg-amber rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
