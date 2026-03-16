"use client";

import React from 'react';

const stats = [
    { label: "Data Safety", value: "100%", sub: "Local Only" },
    { label: "Sync Speed", value: "0ms", sub: "Instant" },
    { label: "Intelligence", value: "Offline", sub: "Edge AI" },
    { label: "Reliability", value: "Local", sub: "SQLite" },
];

export function Stats() {
    return (
        <section className="px-12 py-20 grid grid-cols-2 md:grid-cols-4 gap-12 border-b border-rule bg-paper relative z-10">
            {stats.map((stat, i) => (
                <div key={i} className="flex flex-col gap-3">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-mid font-mono">{stat.label}</span>
                    <div className="flex items-end gap-3">
                        <span className="font-serif text-[clamp(32px,4vw,54px)] font-black leading-none">{stat.value}</span>
                        <span className="text-amber text-[11px] font-mono pb-1">— {stat.sub}</span>
                    </div>
                </div>
            ))}
        </section>
    );
}
