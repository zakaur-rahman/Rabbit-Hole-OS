'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { UsageMeters } from '@/components/dashboard/UsageMeters';
import { Loader2 } from 'lucide-react';

export default function UsagePage() {
    const [usage, setUsage] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUsage() {
            try {
                const res = await apiFetch('/usage/me');
                if (!res.ok) throw new Error('Failed to load usage statistics');
                const data = await res.json();
                setUsage(data);
            } catch (err: any) {
                setError(err.message);
            }
        }
        loadUsage();
    }, []);

    if (error) {
        return <div className="p-4 text-destructive bg-destructive/10 rounded-xl">{error}</div>;
    }

    if (!usage) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Plan Usage</h1>
                <p className="text-muted-foreground">Monitor your resource consumption relative to your current plan tier.</p>
            </div>

            <UsageMeters usage={usage} />
        </div>
    );
}
