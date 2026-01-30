"use client";

import { useEffect, useRef } from "react";

interface HeroCanvasProps {
    targetElementRef: React.RefObject<HTMLElement | null>;
}

export function HeroCanvas({ targetElementRef }: HeroCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Configuration
        const GRID_SIZE = 40;
        const PARTICLE_COUNT = 40; // Increased density
        const PARTICLE_SPEED = 2.5; // Slightly faster
        const TRAIL_LENGTH = 15;
        const ACCENT_COLOR = "16, 185, 129"; // Emerald 500

        let width = 0;
        let height = 0;
        let particles: Particle[] = [];
        let sparks: Spark[] = [];
        let targetRect = { x: 0, y: 0, w: 0, h: 0 };

        // Spark Class (Explosion effect)
        class Spark {
            x: number;
            y: number;
            vx: number;
            vy: number;
            life: number;
            color: string;

            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.life = 1.0;
                this.color = `rgba(16, 185, 129,`;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= 0.05; // Fade out
            }

            draw() {
                if (this.life <= 0) return;
                ctx!.fillStyle = `${this.color}${this.life})`;
                ctx!.beginPath();
                ctx!.arc(this.x, this.y, 1, 0, Math.PI * 2);
                ctx!.fill();
            }
        }

        // Particle Class
        class Particle {
            x: number;
            y: number;
            history: { x: number; y: number }[];
            dead: boolean;
            dir: "H" | "V";

            constructor() {
                this.dead = false;
                this.history = [];

                if (Math.random() < 0.5) {
                    this.x = Math.floor(Math.random() * (width / GRID_SIZE)) * GRID_SIZE;
                    this.y = Math.random() < 0.5 ? -TRAIL_LENGTH * 2 : height + TRAIL_LENGTH * 2;
                    this.dir = "V";
                } else {
                    this.x = Math.random() < 0.5 ? -TRAIL_LENGTH * 2 : width + TRAIL_LENGTH * 2;
                    this.y = Math.floor(Math.random() * (height / GRID_SIZE)) * GRID_SIZE;
                    this.dir = "H";
                }
            }

            update() {
                this.history.push({ x: this.x, y: this.y });
                if (this.history.length > TRAIL_LENGTH) this.history.shift();

                const targetCX = targetRect.x + targetRect.w / 2;
                const targetCY = targetRect.y + targetRect.h / 2;

                // Collision Check (Hit the Screen)
                if (
                    this.x > targetRect.x &&
                    this.x < targetRect.x + targetRect.w &&
                    this.y > targetRect.y &&
                    this.y < targetRect.y + targetRect.h
                ) {
                    this.dead = true;
                    // Spawn Sparks!
                    for (let i = 0; i < 5; i++) {
                        sparks.push(new Spark(this.x, this.y));
                    }
                    return;
                }

                // MOVEMENT LOGIC
                const onGridX = Math.abs(this.x % GRID_SIZE) < PARTICLE_SPEED;
                const onGridY = Math.abs(this.y % GRID_SIZE) < PARTICLE_SPEED;

                if (onGridX && onGridY && Math.random() < 0.15) { // Increased turn chance
                    const dx = targetCX - this.x;
                    const dy = targetCY - this.y;

                    if (this.dir === "H") {
                        if (Math.abs(dy) > GRID_SIZE) this.dir = "V";
                    } else {
                        if (Math.abs(dx) > GRID_SIZE) this.dir = "H";
                    }
                }

                if (this.dir === "H") {
                    const dx = targetCX - this.x;
                    this.x += dx > 0 ? PARTICLE_SPEED : -PARTICLE_SPEED;
                } else {
                    const dy = targetCY - this.y;
                    this.y += dy > 0 ? PARTICLE_SPEED : -PARTICLE_SPEED;
                }
            }

            draw() {
                if (this.history.length < 2) return;

                ctx!.beginPath();
                for (let i = 0; i < this.history.length - 1; i++) {
                    const opacity = i / this.history.length;
                    ctx!.strokeStyle = `rgba(${ACCENT_COLOR}, ${opacity})`;
                    ctx!.lineWidth = 2; // Thicker lines
                    ctx!.beginPath();
                    ctx!.moveTo(this.history[i].x, this.history[i].y);
                    ctx!.lineTo(this.history[i + 1].x, this.history[i + 1].y);
                    ctx!.stroke();
                }

                ctx!.fillStyle = `rgb(${ACCENT_COLOR})`;
                ctx!.beginPath();
                ctx!.arc(this.x, this.y, 2, 0, Math.PI * 2); // Bigger head
                ctx!.fill();

                ctx!.shadowBlur = 15;
                ctx!.shadowColor = `rgb(${ACCENT_COLOR})`;
                ctx!.shadowBlur = 0;
            }
        }

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;

            if (targetElementRef.current) {
                // Get bounding client rect relative to viewport
                // Since HeroCanvas is effectively fixed during scroll (or at least consistent with hero)
                // We need to match the coordinate space.
                // If HeroCanvas is absolute in Hero, we need targetRect relative to Hero.

                const heroRect = canvas.getBoundingClientRect();
                const targetElRect = targetElementRef.current.getBoundingClientRect();

                targetRect = {
                    x: targetElRect.left - heroRect.left,
                    y: targetElRect.top - heroRect.top,
                    w: targetElRect.width,
                    h: targetElRect.height
                };
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Grid
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x <= width; x += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y <= height; y += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            // Update Target Calculation constantly for smooth resize/scroll
            if (targetElementRef.current) {
                const heroRect = canvas.getBoundingClientRect();
                const targetElRect = targetElementRef.current.getBoundingClientRect();
                targetRect = {
                    x: targetElRect.left - heroRect.left,
                    y: targetElRect.top - heroRect.top,
                    w: targetElRect.width,
                    h: targetElRect.height
                };
            }

            // Particles
            if (particles.length < PARTICLE_COUNT) particles.push(new Particle());
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].dead) particles.splice(i, 1);
            }

            // Sparks
            for (let i = sparks.length - 1; i >= 0; i--) {
                sparks[i].update();
                sparks[i].draw();
                if (sparks[i].life <= 0) sparks.splice(i, 1);
            }

            requestAnimationFrame(animate);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        const raf = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(raf);
        };
    }, [targetElementRef]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}
