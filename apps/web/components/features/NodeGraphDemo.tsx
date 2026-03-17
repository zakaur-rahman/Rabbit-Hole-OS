"use client";

import React, { useEffect, useRef } from 'react';

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    pulse: number;
    active: boolean;
}

export function NodeGraphDemo() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let W: number, H: number;
        const NODES: Node[] = [];

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            W = canvas.width = parent.offsetWidth;
            H = canvas.height = parent.offsetHeight;
            initNodes();
        };

        const initNodes = () => {
            NODES.length = 0;
            const count = Math.min(24, Math.floor(W / 40));
            for (let i = 0; i < count; i++) {
                NODES.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 3 + 2,
                    pulse: Math.random() * Math.PI * 2,
                    active: Math.random() > 0.7
                });
            }
        };

        const drawFrame = (t: number) => {
            ctx.clearRect(0, 0, W, H);
            const maxDist = 180;

            NODES.forEach((n, i) => {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
                
                n.pulse += 0.02;

                // Mouse influence
                const dxm = mouse.current.x - n.x;
                const dym = mouse.current.y - n.y;
                const distm = Math.sqrt(dxm * dxm + dym * dym);
                if (distm < 150) {
                    n.x += dxm * 0.005;
                    n.y += dym * 0.005;
                }

                for (let j = i + 1; j < NODES.length; j++) {
                    const m = NODES[j];
                    const dx = m.x - n.x;
                    const dy = m.y - n.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.4;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(m.x, m.y);
                        ctx.strokeStyle = `rgba(32, 32, 32, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();

                        // Flowing data
                        if (dist < maxDist * 0.5) {
                            const flow = (t * 0.0005 + i * 0.1) % 1;
                            ctx.beginPath();
                            ctx.arc(n.x + dx * flow, n.y + dy * flow, 1.2, 0, Math.PI * 2);
                            ctx.fillStyle = `rgba(200, 134, 10, ${alpha * 1.5})`;
                            ctx.fill();
                        }
                    }
                }

                const glow = 0.4 + Math.sin(n.pulse) * 0.2;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = n.active ? `rgba(200, 134, 10, ${glow + 0.3})` : `rgba(32, 32, 32, ${glow})`;
                ctx.fill();
                
                if (n.active) {
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(200, 134, 10, 0.15)`;
                    ctx.stroke();
                }
            });
            requestAnimationFrame(drawFrame);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            mouse.current.x = e.clientX - r.left;
            mouse.current.y = e.clientY - r.top;
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', resize);
        resize();
        
        const animId = requestAnimationFrame(drawFrame);

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <div className="w-full h-[400px] border border-rule bg-cream relative overflow-hidden shadow-[12px_12px_0_var(--faint)]">
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink/60">Live Discovery Engine v1.0</span>
            </div>
            <div className="absolute bottom-6 left-6 max-w-[200px]">
                <p className="font-serif italic text-[12px] text-mid leading-snug">
                    Nodes represent research entities. Edges represent semantic connections formed through synthesis.
                </p>
            </div>
        </div>
    );
}
