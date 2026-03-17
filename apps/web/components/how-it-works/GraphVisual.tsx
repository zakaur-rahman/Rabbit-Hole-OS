"use client";

import { motion } from "framer-motion";

export function GraphVisual() {
    const nodes = [
        { id: 1, x: 100, y: 250, color: "var(--cream)" },
        { id: 2, x: 200, y: 150, color: "var(--amber)" },
        { id: 3, x: 300, y: 250, color: "var(--cream)" },
        { id: 4, x: 200, y: 350, color: "var(--amber)" },
    ];

    const links = [
        { from: nodes[0], to: nodes[1], delay: 1 },
        { from: nodes[1], to: nodes[2], delay: 2.5 },
        { from: nodes[2], to: nodes[3], delay: 4 },
    ];

    return (
        <div className="w-full aspect-square border border-rule bg-white shadow-[12px_12px_0_var(--faint)] relative overflow-hidden grid place-items-center">
            <motion.svg 
                width="400" 
                height="400" 
                viewBox="0 0 400 400" 
                className="w-full h-full max-w-[300px]"
                animate={{ 
                    scale: [0.9, 1.1, 1.1, 0.9],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                    duration: 6, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
            >
                <g>
                    {/* Background Grid */}
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--rule)" strokeWidth="0.5" opacity="0.2"/>
                    </pattern>
                    <rect width="400" height="400" fill="url(#grid)" />

                    {/* Lines */}
                    {links.map((link, i) => (
                        <motion.line 
                            key={`link-${i}`}
                            x1={link.from.x} y1={link.from.y} 
                            x2={link.to.x} y2={link.to.y}
                            stroke="var(--ink)" strokeWidth="1.5"
                            strokeDasharray="4 4"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ 
                                pathLength: [0, 1],
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{ 
                                duration: 1.5, 
                                delay: link.delay,
                                repeat: Infinity,
                                repeatDelay: 3.5
                            }}
                        />
                    ))}

                    {/* Nodes */}
                    {nodes.map((node, i) => (
                        <motion.g key={`node-${i}`}>
                            <motion.circle 
                                cx={node.x} cy={node.y} r="12" 
                                fill={node.color} stroke="var(--ink)" strokeWidth="2"
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1, 1, 0] }}
                                transition={{ 
                                    duration: 1, 
                                    delay: i * 0.8,
                                    repeat: Infinity,
                                    repeatDelay: 4.5
                                }}
                            />
                            {/* Inner pulse */}
                            <motion.circle 
                                cx={node.x} cy={node.y} r="12" 
                                fill="none" stroke="var(--amber)" strokeWidth="1"
                                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, delay: i * 0.8 }}
                            />
                        </motion.g>
                    ))}

                    {/* Connecting Probe */}
                    <motion.circle 
                        r="4" fill="var(--amber)"
                        animate={{ 
                            cx: [100, 200, 300, 200, 100],
                            cy: [250, 150, 250, 350, 250],
                            opacity: [0, 1, 1, 1, 1, 0]
                        }}
                        transition={{ 
                            duration: 5, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                        }}
                    />
                </g>
            </motion.svg>
            <div className="absolute bottom-6 right-6 font-mono text-[9px] uppercase tracking-widest text-mid">
                System Logic Visualized
            </div>
        </div>
    );
}
