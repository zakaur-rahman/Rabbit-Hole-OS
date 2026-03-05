"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
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
        <div className="pt-18 pb-20 min-h-screen bg-[#020617] text-white">
            <Section>
                <Container>
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">
                            Ready to Upgrade Your Mind?
                        </h1>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of researchers and developers who trust Cognode for their most critical work.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* macOS Card */}
                        <div className={cn(
                            "relative p-10 rounded-3xl border bg-zinc-900/50 backdrop-blur-xl flex flex-col items-center text-center space-y-8 transition-all duration-300 group",
                            os === "mac"
                                ? "border-emerald-500/50 shadow-[0_0_50px_-20px_rgba(16,185,129,0.3)] bg-zinc-900/80"
                                : "border-white/10 hover:border-white/20"
                        )}>
                            {os === "mac" && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Recommended for you
                                </div>
                            )}

                            <div className="w-24 h-24 rounded-full bg-black/50 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <AppleLogo className="w-10 h-10 text-white" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">macOS</h2>
                                <div className="space-y-1">
                                    <p className="text-zinc-400">macOS 12.0 (Monterey) or later</p>
                                    <p className="text-zinc-500 text-sm">Universal (Apple Silicon & Intel)</p>
                                </div>
                            </div>

                            <Button
                                className={cn(
                                    "w-full h-14 text-lg rounded-full transition-all duration-300",
                                    os === "mac"
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                                )}
                            >
                                Download for Mac (.dmg)
                            </Button>
                        </div>

                        {/* Windows Card */}
                        <div className={cn(
                            "relative p-10 rounded-3xl border bg-zinc-900/50 backdrop-blur-xl flex flex-col items-center text-center space-y-8 transition-all duration-300 group",
                            os === "win"
                                ? "border-emerald-500/50 shadow-[0_0_50px_-20px_rgba(16,185,129,0.3)] bg-zinc-900/80"
                                : "border-white/10 hover:border-white/20"
                        )}>
                            {os === "win" && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Recommended for you
                                </div>
                            )}

                            <div className="w-24 h-24 rounded-full bg-black/50 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <WindowsLogo className="w-10 h-10 text-white" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">Windows</h2>
                                <div className="space-y-1">
                                    <p className="text-zinc-400">Windows 10 or 11 (64-bit)</p>
                                    <p className="text-zinc-500 text-sm">x64 Architecture</p>
                                </div>
                            </div>

                            <Button
                                className={cn(
                                    "w-full h-14 text-lg rounded-full transition-all duration-300",
                                    os === "win"
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                                )}
                            >
                                Download for Windows (.exe)
                            </Button>
                        </div>
                    </div>

                    <div className="mt-20 max-w-2xl mx-auto text-center space-y-6">
                        <h3 className="font-medium text-zinc-500 uppercase tracking-widest text-xs">System Requirements</h3>
                        <ul className="text-zinc-400 space-y-3 text-sm">
                            <li>• 8GB RAM minimum (16GB recommended for large graphs)</li>
                            <li>• 2GB free disk space</li>
                            <li>• Internet connection required only for initial setup and updates</li>
                        </ul>
                        <p className="pt-8 text-xs text-zinc-600">
                            Linux support is currently in beta. <a href="#" className="underline hover:text-emerald-400 transition-colors">Join the preview list.</a>
                        </p>
                    </div>
                </Container>
            </Section>
        </div>
    );
}
