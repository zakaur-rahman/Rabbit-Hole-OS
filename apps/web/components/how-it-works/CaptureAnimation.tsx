"use client";

import { motion } from "framer-motion";
import { Search, FileText, Globe, MousePointer2 } from "lucide-react";

export function CaptureAnimation() {
    return (
        <div className="relative w-full h-[300px] bg-white border border-ink shadow-[12px_12px_0_var(--faint)] overflow-hidden p-8">
            {/* Background "Web" simulation */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="grid grid-cols-12 h-full w-full">
                    {[...Array(48)].map((_, i) => (
                        <div key={i} className="border-[0.5px] border-ink h-12" />
                    ))}
                </div>
            </div>

            <div className="relative z-10 h-full flex flex-col justify-center items-center">
                {/* Floating "Sources" */}
                <div className="absolute inset-0">
                    {[
                        { icon: <FileText className="w-4 h-4" />, x: "10%", y: "20%", delay: 0 },
                        { icon: <Globe className="w-4 h-4" />, x: "80%", y: "15%", delay: 1.5 },
                        { icon: <FileText className="w-4 h-4" />, x: "75%", y: "70%", delay: 0.8 },
                        { icon: <Globe className="w-4 h-4" />, x: "15%", y: "75%", delay: 2.2 },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                                opacity: [0, 1, 1, 0],
                                scale: [0.8, 1, 1, 0.8],
                                x: ["0%", "50%"],
                                y: ["0%", "50%"]
                            }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 4, 
                                delay: item.delay,
                                times: [0, 0.2, 0.8, 1]
                            }}
                            style={{ position: "absolute", left: item.x, top: item.y }}
                            className="p-3 border border-rule bg-cream text-mid flex items-center gap-2 rounded-sm"
                        >
                            {item.icon}
                            <div className="h-1 w-8 bg-rule/30 rounded-full" />
                        </motion.div>
                    ))}
                </div>

                {/* Central "Node" capture point */}
                <div className="relative">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.05, 1],
                            borderColor: ["var(--ink)", "var(--amber)", "var(--ink)"]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-24 h-24 border-2 border-ink bg-white flex items-center justify-center relative z-20"
                    >
                        <Search className="w-8 h-8 text-amber" />
                        
                        {/* Scanning ring */}
                        <motion.div 
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 border border-amber rounded-full"
                        />
                    </motion.div>
                </div>

                {/* Status indicator */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 flex flex-col items-center"
                >
                    <div className="font-mono text-[9px] tracking-[0.2em] text-mid uppercase mb-2">Ingestion Active</div>
                    <div className="flex gap-1 h-3 items-end">
                        {[...Array(4)].map((_, i) => (
                            <motion.div 
                                key={i}
                                animate={{ height: ["20%", "100%", "20%"] }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                className="w-1 bg-amber"
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Simulated Cursor */}
            <motion.div
                animate={{ 
                    x: [100, 250, 150, 200, 100],
                    y: [50, 200, 100, 250, 50]
                }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                className="absolute text-amber pointer-events-none z-30 opacity-50"
            >
                <MousePointer2 className="w-4 h-4 fill-amber" />
            </motion.div>
        </div>
    );
}
