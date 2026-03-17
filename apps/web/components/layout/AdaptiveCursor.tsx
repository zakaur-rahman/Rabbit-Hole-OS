"use client";

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export function AdaptiveCursor() {
    const [mounted, setMounted] = useState(false);
    
    // Position motion values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth physics
    const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
    const elasticX = useSpring(mouseX, springConfig);
    const elasticY = useSpring(mouseY, springConfig);

    useEffect(() => {
        setMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-9999">
            {/* The primary blending dot */}
            <motion.div
                style={{
                    x: elasticX,
                    y: elasticY,
                    left: -6,
                    top: -6,
                }}
                className="w-3 h-3 rounded-full bg-white mix-blend-difference"
            />
            
            {/* Outer ring for precision */}
            <motion.div
                style={{
                    x: mouseX,
                    y: mouseY,
                    left: -15,
                    top: -15,
                }}
                className="w-[30px] h-[30px] rounded-full border border-white/20 mix-blend-difference"
                animate={{
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        </div>
    );
}
