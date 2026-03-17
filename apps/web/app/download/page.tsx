"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const AppleLogo = ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 384 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
    </svg>
);

const WindowsLogo = ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0h11.377v11.372H0V0zm12.623 0H24v11.372H12.623V0zM0 12.623h11.377V24H0V12.623zm12.623 0H24V24H12.623V12.623z" />
    </svg>
);

export default function DownloadPage() {
    const [os, setOs] = useState<"mac" | "win" | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            if (userAgent.indexOf("mac") !== -1) {
                setOs("mac");
            } else if (userAgent.indexOf("win") !== -1) {
                setOs("win");
            }
        }, 0);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="pt-32 pb-24 bg-paper text-ink min-h-screen relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-96 h-96 border-b border-l border-rule/50 pointer-events-none translate-x-32 -translate-y-32 rotate-45" />
            
            <div className="px-8 md:px-12 max-w-6xl mx-auto relative z-10">
                <header className="text-center mb-24">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center justify-center gap-3 mb-6"
                    >
                        <div className="w-10 h-10 border-[1.5px] border-ink grid place-items-center">
                            <div className="w-3 h-3 bg-amber rounded-full" />
                        </div>
                        <span className="font-mono text-[12px] tracking-[0.2em] uppercase text-amber font-bold">Release v1.0.4</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="font-serif text-5xl md:text-7xl mb-12 tracking-tighter"
                    >
                        Ready to Upgrade <br /> Your <em className="italic font-normal text-amber">Mind?</em>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-mid text-[18px] max-w-2xl mx-auto leading-relaxed font-mono"
                    >
                        Join a dedicated community of researchers and founders who trust Cognode for their most critical knowledge work.
                    </motion.p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {/* macOS */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={cn(
                            "relative p-12 bg-white border border-rule flex flex-col items-center text-center transition-all duration-300 group",
                            os === "mac" ? "shadow-[16px_16px_0_var(--faint)] ring-2 ring-amber/20" : "shadow-[8px_8px_0_var(--faint)] hover:shadow-[12px_12px_0_var(--faint)]"
                        )}
                    >
                        {os === "mac" && (
                            <div className="absolute -top-4 bg-amber text-ink text-[10px] font-mono tracking-widest uppercase px-4 py-1 border border-ink shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
                                Recommended
                            </div>
                        )}

                        <div className="w-20 h-20 border border-rule bg-cream grid place-items-center mb-10 group-hover:bg-amber transition-colors duration-500">
                            <AppleLogo className="w-8 h-8 text-ink" />
                        </div>

                        <h2 className="font-serif text-3xl font-bold mb-4">macOS</h2>
                        <div className="font-mono text-[12px] text-mid mb-12 space-y-2">
                            <p>Monterey 12.0 or later</p>
                            <p className="opacity-50 tracking-tighter">Universal (Silicon & Intel)</p>
                        </div>

                        <button className={cn(
                            "w-full py-4 px-8 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3",
                            os === "mac" 
                                ? "bg-ink text-paper hover:bg-amber hover:text-ink" 
                                : "bg-cream text-ink border border-rule hover:border-ink"
                        )}>
                            Download .dmg
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>

                    {/* Windows */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={cn(
                            "relative p-12 bg-white border border-rule flex flex-col items-center text-center transition-all duration-300 group",
                            os === "win" ? "shadow-[16px_16px_0_var(--faint)] ring-2 ring-amber/20" : "shadow-[8px_8px_0_var(--faint)] hover:shadow-[12px_12px_0_var(--faint)]"
                        )}
                    >
                        {os === "win" && (
                            <div className="absolute -top-4 bg-amber text-ink text-[10px] font-mono tracking-widest uppercase px-4 py-1 border border-ink shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
                                Recommended
                            </div>
                        )}

                        <div className="w-20 h-20 border border-rule bg-cream grid place-items-center mb-10 group-hover:bg-amber transition-colors duration-500">
                            <WindowsLogo className="w-8 h-8 text-ink" />
                        </div>

                        <h2 className="font-serif text-3xl font-bold mb-4">Windows</h2>
                        <div className="font-mono text-[12px] text-mid mb-12 space-y-2">
                            <p>Windows 10 or 11</p>
                            <p className="opacity-50 tracking-tighter">x64 Architecture</p>
                        </div>

                        <button className={cn(
                            "w-full py-4 px-8 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3",
                            os === "win" 
                                ? "bg-ink text-paper hover:bg-amber hover:text-ink" 
                                : "bg-cream text-ink border border-rule hover:border-ink"
                        )}>
                            Download .exe
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-32 pt-20 border-t border-rule"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                        <div>
                            <span className="font-mono text-[10px] uppercase text-amber block mb-4">Hardware</span>
                            <p className="font-mono text-[12px] text-mid leading-loose">
                                8GB RAM minimum. <br />
                                2GB free disk space.
                            </p>
                        </div>
                        <div>
                            <span className="font-mono text-[10px] uppercase text-amber block mb-4">Privacy</span>
                            <p className="font-mono text-[12px] text-mid leading-loose">
                                Local-first processing. <br />
                                Deterministic data isolation.
                            </p>
                        </div>
                        <div>
                            <span className="font-mono text-[10px] uppercase text-amber block mb-4">Beta</span>
                            <p className="font-mono text-[12px] text-mid leading-loose">
                                Linux support in preview. <br />
                                <a href="/support" className="border-b border-rule hover:border-amber transition-colors">Join waitlist</a>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
