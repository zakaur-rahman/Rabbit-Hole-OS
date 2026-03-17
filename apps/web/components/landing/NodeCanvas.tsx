"use client";

import React, { useEffect, useRef } from 'react';

export function NodeCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        interface CanvasNode {
            x: number;
            y: number;
            vx: number;
            vy: number;
            r: number;
            pulse: number;
        }

        let W: number, H: number;
        const NODES: CanvasNode[] = [];

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            W = canvas.width = parent.offsetWidth;
            H = canvas.height = parent.offsetHeight;
            initNodes();
        };

        const initNodes = () => {
            NODES.length = 0;
            const count = Math.min(44, Math.floor(W / 26));
            for (let i = 0; i < count; i++) {
                NODES.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.42,
                    vy: (Math.random() - 0.5) * 0.42,
                    r: Math.random() * 2.5 + 1.5,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        };

        const drawFrame = (t: number) => {
            ctx.clearRect(0, 0, W, H);
            const maxDist = 130;

            NODES.forEach((n, i) => {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
                n.x = Math.max(0, Math.min(W, n.x));
                n.y = Math.max(0, Math.min(H, n.y));

                // Mouse repel
                const mdx = mouse.current.x - n.x, mdy = mouse.current.y - n.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 100) { n.x -= mdx * 0.012; n.y -= mdy * 0.012; }
                n.pulse += 0.03;

                for (let j = i + 1; j < NODES.length; j++) {
                    const m = NODES[j];
                    const dx = m.x - n.x, dy = m.y - n.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.32;
                        // Edge line
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(m.x, m.y);
                        ctx.strokeStyle = `rgba(200, 134, 10, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();

                        // Flowing data particle
                        const flow = ((t * 0.0008) + (i * 0.13)) % 1;
                        const px = n.x + dx * flow, py = n.y + dy * flow;
                        ctx.beginPath();
                        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(232, 160, 32, ${alpha * 1.8})`;
                        ctx.fill();
                    }
                }

                const glow = 0.55 + Math.sin(n.pulse) * 0.45;
                const nearMouse = Math.sqrt((mouse.current.x - n.x) ** 2 + (mouse.current.y - n.y) ** 2) < 80;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = nearMouse ? `rgba(245, 230, 192, ${glow})` : `rgba(200, 134, 10, ${glow * 0.85})`;
                ctx.fill();
                if (nearMouse) {
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(200, 134, 10, 0.28)`;
                    ctx.lineWidth = 1;
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

        const handleMouseLeave = () => {
            mouse.current.x = -9999;
            mouse.current.y = -9999;
        };

        window.addEventListener('resize', resize);
        const parent = canvas.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mouseleave', handleMouseLeave);
        }

        resize();
        const animId = requestAnimationFrame(drawFrame);

        return () => {
            window.removeEventListener('resize', resize);
            if (parent) {
                parent.removeEventListener('mousemove', handleMouseMove);
                parent.removeEventListener('mouseleave', handleMouseLeave);
            }
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 pointer-events-none z-0" 
        />
    );
}
