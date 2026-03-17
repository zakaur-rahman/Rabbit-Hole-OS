'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    delay?: number;
}

export function DashboardCard({ children, className, hover = true, delay = 0 }: DashboardCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
            className={cn(
                "relative bg-white/2 border border-white/5 rounded-2xl p-6 backdrop-blur-xl group transition-all duration-300",
                hover && "hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:bg-white/4",
                className
            )}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
            
            {/* Top Light Ray */}
            <div className="absolute top-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
