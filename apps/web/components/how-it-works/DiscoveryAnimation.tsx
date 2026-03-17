"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const nodes = [
    { x: 150, y: 150, size: 8, label: "Core Concept", delay: 0 },
    { x: 50, y: 100, size: 4, label: "Context A", delay: 0.5 },
    { x: 250, y: 80, size: 5, label: "Context B", delay: 1.2 },
    { x: 220, y: 220, size: 4, label: "Evidence", delay: 0.8 },
    { x: 80, y: 240, size: 6, label: "Critique", delay: 2.0 },
    { x: 100, y: 50, size: 3, label: "Ref 01", delay: 1.5 },
];

export function DiscoveryAnimation() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActive((prev) => (prev + 1) % nodes.length);
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full h-[300px] bg-paper border border-ink shadow-[12px_12px_0_var(--faint)] overflow-hidden p-8 grid place-items-center">
            <svg viewBox="0 0 300 300" className="w-full h-full max-w-[240px]">
                {/* Connections */}
                {nodes.map((node, i) => (
                    i > 0 && (
                        <motion.line
                            key={`line-${i}`}
                            x1={nodes[0].x}
                            y1={nodes[0].y}
                            x2={node.x}
                            y2={node.y}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ 
                                pathLength: 1, 
                                opacity: active === i ? 0.8 : 0.1,
                                stroke: active === i ? "var(--amber)" : "var(--rule)"
                            }}
                            transition={{ duration: 1, delay: node.delay }}
                            strokeWidth="1"
                            strokeDasharray="4 2"
                        />
                    )
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => (
                    <g key={i}>
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r={node.size}
                            initial={{ scale: 0 }}
                            animate={{ 
                                scale: active === i ? 1.5 : 1,
                                fill: active === i ? "var(--amber)" : "var(--ink)",
                                stroke: active === i ? "var(--ink)" : "transparent"
                            }}
                            transition={{ type: "spring", stiffness: 300 }}
                            strokeWidth="1"
                        />
                        {active === i && (
                            <motion.text
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                x={node.x}
                                y={node.y + node.size + 15}
                                textAnchor="middle"
                                className="font-mono text-[8px] uppercase tracking-tighter fill-amber font-bold"
                            >
                                {node.label}
                            </motion.text>
                        )}
                        {/* Pulse for active node */}
                        {active === i && (
                            <motion.circle
                                cx={node.x}
                                cy={node.y}
                                r={node.size}
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                fill="none"
                                stroke="var(--amber)"
                                strokeWidth="0.5"
                            />
                        )}
                    </g>
                ))}
            </svg>

            <div className="absolute bottom-6 left-0 w-full text-center">
                <div className="font-mono text-[9px] tracking-[0.3em] text-mid uppercase opacity-50">Emergent Structure Detected</div>
            </div>

            {/* Ambient scan line */}
            <motion.div 
                animate={{ y: ["0%", "300%"] }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-px bg-amber/20 shadow-[0_0_10px_var(--amber)] z-0"
            />
        </div>
    );
}
