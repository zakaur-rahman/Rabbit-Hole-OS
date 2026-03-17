'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { UsageMeters, UsageData } from '@/components/dashboard/UsageMeters';
import { Loader2 } from 'lucide-react';

export default function UsagePage() {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadUsage = async () => {
        setError(null);
        setUsage(null);
        try {
            const res = await apiFetch('/usage/me');
            if (!res.ok) throw new Error('Failed to load usage statistics');
            const data = await res.json();
            setUsage(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    useEffect(() => {
        loadUsage();
    }, []);

    if (error) {
        return (
            <div className="p-6 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center gap-4 max-w-md mx-auto mt-16">
                <p className="text-sm text-center">{error}</p>
                <button onClick={loadUsage} className="px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    if (!usage) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-12">
            <div>
                <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber mb-3 block"
                >
                    Infrastructure Metrics
                </motion.span>
                <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight leading-none mb-4"
                >
                    Plan Usage
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-neutral-500 text-[14px] font-mono max-w-lg leading-relaxed"
                >
                    Monitor your resource architecture and consumption metrics relative to your current protocol tier.
                </motion.p>
            </div>

            <UsageMeters usage={usage} />
        </div>
    );
}
