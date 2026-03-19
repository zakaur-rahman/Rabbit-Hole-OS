'use client';

import React, { useEffect, useRef, useState } from 'react';

const stepsData = [
    { label: 'Validating credentials', dur: 1600 },
    { label: 'Verifying user identity', dur: 2000 },
    { label: 'Establishing secure session', dur: 1400 },
    { label: 'Loading user workspace', dur: 1800 },
    { label: 'Syncing knowledge graph', dur: 1200 },
];

export function AuthLoaderAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [globalProgress, setGlobalProgress] = useState(0);
    const [stepProgress, setStepProgress] = useState<number[]>(Array(stepsData.length).fill(0));

    // Animation runner
    useEffect(() => {
        let active = true;
        let animationFrameId: number;
        let startProgress = 0;
        const totalDur = stepsData.reduce((a, s) => a + s.dur, 0);

        const runSequence = () => {
            if (!active) return;
            setCurrentStepIndex(0);
            setStepProgress(Array(stepsData.length).fill(0));
            setGlobalProgress(0);
            startProgress = 0;
            setTimeout(() => { if (active) executeStep(0); }, 500);
        };

        const executeStep = (i: number) => {
            if (!active) return;
            if (i >= stepsData.length) {
                // Loop sequence
                setTimeout(runSequence, 700);
                return;
            }

            setCurrentStepIndex(i);
            const dur = stepsData[i].dur;
            let start: number | null = null;

            const tick = (ts: number) => {
                if (!active) return;
                if (!start) start = ts;
                const elapsed = ts - start;
                const pct = Math.min(elapsed / dur, 1);

                setStepProgress(prev => {
                    const next = [...prev];
                    next[i] = pct * 100;
                    return next;
                });

                const currentGlobalPct = ((startProgress + dur * pct) / totalDur) * 100;
                setGlobalProgress(currentGlobalPct);

                if (pct < 1) {
                    animationFrameId = requestAnimationFrame(tick);
                } else {
                    startProgress += dur;
                    setTimeout(() => { if (active) executeStep(i + 1); }, 60);
                }
            };
            animationFrameId = requestAnimationFrame(tick);
        };

        runSequence();

        return () => {
            active = false;
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Canvas background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w: number, h: number;
        const pts: { x: number, y: number, vx: number, vy: number, r: number, pulse: number }[] = [];
        let animationFrameId: number;

        const resize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        };

        const initPts = () => {
            pts.length = 0;
            const n = Math.min(30, Math.floor(w / 42));
            for (let i = 0; i < n; i++) {
                pts.push({
                    x: Math.random() * w, 
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.3, 
                    vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 1.8 + 1,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        };

        const draw = (t: number) => {
            ctx.clearRect(0, 0, w, h);
            pts.forEach((p, i) => {
                p.x += p.vx; 
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                p.pulse += 0.022;

                for (let j = i + 1; j < pts.length; j++) {
                    const q = pts[j];
                    const dx = q.x - p.x, dy = q.y - p.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 115) {
                        const a = (1 - d / 115) * 0.18;
                        ctx.beginPath(); 
                        ctx.moveTo(p.x, p.y); 
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(200,134,10,${a})`; 
                        ctx.lineWidth = 0.6; 
                        ctx.stroke();
                        
                        const f = ((t * 0.0005) + i * 0.11) % 1;
                        ctx.beginPath(); 
                        ctx.arc(p.x + dx * f, p.y + dy * f, 1.3, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(232,160,32,${a * 1.5})`; 
                        ctx.fill();
                    }
                }
                const g = 0.4 + Math.sin(p.pulse) * 0.38;
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,134,10,${g * 0.65})`; 
                ctx.fill();
            });
            animationFrameId = requestAnimationFrame(draw);
        };

        resize();
        initPts();
        animationFrameId = requestAnimationFrame(draw);

        window.addEventListener('resize', () => { resize(); initPts(); });

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 bg-[#0a0906] flex items-center justify-center overflow-hidden font-mono z-0">
            <style>{`
                .loader-scan-line {
                    position: absolute; left: 0; right: 0; height: 1px;
                    background: rgba(200,134,10,0.07);
                    animation: loader-scan 5s linear infinite;
                    pointer-events: none; z-index: 3;
                }
                @keyframes loader-scan { from { top: 0; } to { top: 100%; } }

                .card-top-bar::after {
                    content: '';
                    position: absolute; top: 0; left: -30%;
                    width: 30%; height: 100%;
                    background: rgba(255,210,120,0.5);
                    animation: bar-sweep 2s cubic-bezier(0.4,0,0.6,1) infinite;
                }
                @keyframes bar-sweep { to { left: 130%; } }

                .spin-ring-1 { animation: rspin 10s linear infinite; }
                .spin-ring-2 { animation: rspin 2.2s cubic-bezier(0.5,0,0.5,1) infinite; }
                .spin-ring-3 { animation: rspin 14s linear infinite reverse; }
                .spin-ring-4 { animation: rspin 1.5s linear infinite reverse; }
                @keyframes rspin { to { transform: rotate(360deg); } }

                .shield-dot, .step-ico-active { animation: core-pulse 1.6s ease-in-out infinite; }
                @keyframes core-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.6; }
                }

                .f-dot { animation: fdot 1.4s ease-in-out infinite; }
                .f-dot:nth-child(2) { animation-delay: 0.18s; }
                .f-dot:nth-child(3) { animation-delay: 0.36s; }
                @keyframes fdot {
                    0%, 80%, 100% { transform: scale(1); opacity: 0.3; background: rgba(200,134,10,0.3); }
                    40% { transform: scale(1.6); opacity: 1; background: #c8860a; }
                }
            `}</style>
            
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>
            <div className="loader-scan-line"></div>

            <div className="relative z-10 w-[380px] bg-[#111009] border border-[#c8860a]/20 flex flex-col items-center overflow-hidden">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-[1.5px] border-transparent border-t-[#c8860a]/50 border-l-[#c8860a]/50"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-[1.5px] border-transparent border-t-[#c8860a]/50 border-r-[#c8860a]/50"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-[1.5px] border-transparent border-b-[#c8860a]/50 border-l-[#c8860a]/50"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-[1.5px] border-transparent border-b-[#c8860a]/50 border-r-[#c8860a]/50"></div>

                {/* Progress Bar */}
                <div className="card-top-bar w-full h-[2px] bg-[#c8860a]/20 relative overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-[#c8860a] transition-all duration-300 ease-out"
                        style={{ width: `${globalProgress}%` }}
                    ></div>
                </div>

                {/* Header */}
                <div className="w-full pt-[18px] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-[1.5px] border-[#c8860a]/60 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-[#c8860a] rounded-full"></div>
                        </div>
                        <span className="font-serif text-[14px] font-bold text-[#f0ece0]/65 tracking-[0.02em]">Cognode</span>
                    </div>
                    <span className="text-[9px] font-light tracking-[0.16em] uppercase text-[#c8860a]/50 border border-[#c8860a]/20 px-2 py-[3px]">
                        Auth
                    </span>
                </div>

                {/* Visual */}
                <div className="mt-8 mb-6 relative w-[88px] h-[88px] flex items-center justify-center">
                    <div className="absolute rounded-full border border-[rgba(200,134,10,0.12)] inset-0 spin-ring-1"></div>
                    <div className="absolute rounded-full border border-transparent border-t-[rgba(200,134,10,0.5)] border-r-[rgba(200,134,10,0.15)] inset-[8px] spin-ring-2"></div>
                    <div className="absolute rounded-full border border-[rgba(200,134,10,0.07)] inset-[18px] spin-ring-3"></div>
                    <div className="absolute rounded-full border border-transparent border-t-[rgba(232,160,32,0.65)] inset-[27px] spin-ring-4"></div>
                    
                    <div className="w-9 h-9 rounded-full border-[1.5px] border-[#c8860a]/40 flex items-center justify-center relative">
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="8" r="4" stroke="rgba(200,134,10,0.7)" strokeWidth="1.5"/>
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(200,134,10,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#111009] rounded-full flex items-center justify-center">
                            <div className="shield-dot w-2 h-2 rounded-full bg-[#c8860a]"></div>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <h2 className="font-serif text-xl font-bold text-[#f0ece0] tracking-[-0.02em] mb-2 text-center px-6">
                    Verifying <em className="italic text-[#c8860a]">User</em> Identity
                </h2>
                <p className="text-[10px] font-light tracking-[0.15em] uppercase text-[#c8860a]/50 text-center leading-[1.9] px-7 mb-6 min-h-[36px]">
                    Authenticating credentials &amp;<br/>establishing secure session...
                </p>

                <div className="w-[calc(100%-48px)] h-[1px] bg-[#c8860a]/10 mb-5"></div>

                {/* Steps */}
                <div className="flex flex-col w-full px-6">
                    {stepsData.map((step, idx) => {
                        const isActive = idx === currentStepIndex;
                        const isDone = idx < currentStepIndex;
                        return (
                            <div key={idx} className={`flex items-center gap-[11px] py-2 border-b border-[#c8860a]/[0.06] transition-opacity duration-500 last:border-b-0
                                ${isActive ? 'opacity-100' : isDone ? 'opacity-50' : 'opacity-25'}
                            `}>
                                <div className={`w-[18px] h-[18px] rounded-full flex-shrink-0 border flex items-center justify-center transition-all duration-300
                                    ${isActive ? 'border-[#c8860a] step-ico-active' : isDone ? 'bg-[#c8860a]/20 border-[#c8860a]/40' : 'border-[#c8860a]/30'}
                                `}>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#c8860a]"></div>}
                                    {isDone && <span className="text-[9px] text-[#c8860a]/80 font-mono">✓</span>}
                                </div>
                                <span className={`text-[10.5px] font-light tracking-[0.09em] uppercase flex-1 transition-colors duration-300
                                    ${isActive ? 'text-[#f0ece0]/90' : 'text-[#f0ece0]/55'}
                                `}>
                                    {step.label}
                                </span>
                                <div className={`flex-none w-11 h-[2px] bg-[#c8860a]/12 rounded-[1px] overflow-hidden transition-opacity duration-300
                                    ${isActive ? 'opacity-100' : 'opacity-0'}
                                `}>
                                    <div className="h-full bg-[#c8860a]" style={{ width: `${stepProgress[idx]}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Dots */}
                <div className="flex items-center justify-center gap-2 mt-[22px] mb-7">
                    <div className="w-1 h-1 rounded-full bg-[#c8860a]/30 f-dot"></div>
                    <div className="w-1 h-1 rounded-full bg-[#c8860a]/30 f-dot"></div>
                    <div className="w-1 h-1 rounded-full bg-[#c8860a]/30 f-dot"></div>
                </div>
            </div>
        </div>
    );
}
