'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { PlanCard } from '@/components/dashboard/PlanCard';
import { PlanType } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function BillingPage() {
    const [plan, setPlan] = useState<PlanType | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUser() {
            try {
                const res = await apiFetch('/oauth/me');
                if (!res.ok) throw new Error('Failed to load user profile');
                const data = await res.json();

                // Use realistic DB plan or default to free
                setPlan((data.plan as PlanType) || 'free');
            } catch (err: any) {
                setError(err.message);
            }
        }
        loadUser();
    }, []);

    if (error) {
        return <div className="p-4 text-destructive bg-destructive/10 rounded-xl">{error}</div>;
    }

    if (!plan) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Billing & Plans</h1>
                <p className="text-muted-foreground">Manage your subscription, view current limits, and upgrade your account.</p>
            </div>

            <PlanCard currentPlan={plan} />
        </div>
    );
}
