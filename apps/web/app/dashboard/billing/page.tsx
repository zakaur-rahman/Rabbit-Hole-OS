'use client';

import { PlanCard } from '@/components/dashboard/PlanCard';
import { UpcomingPlan } from '@/components/dashboard/UpcomingPlan';
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement';
import { PaymentHistory } from '@/components/dashboard/PaymentHistory';
import { PlanType } from '@/lib/constants';
import { useUser } from '@/components/providers/UserContext';
import { Loader2, Mail } from 'lucide-react';

export default function BillingPage() {
    const { user, isLoading, error, reload } = useUser();
    const plan = (user?.plan as PlanType) || 'free';

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="p-8 text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex flex-col items-center gap-4 max-w-md mx-auto">
                    <p className="text-[13px] font-mono text-center uppercase tracking-widest leading-relaxed">{error}</p>
                    <button 
                        onClick={reload} 
                        className="px-6 py-2.5 text-[11px] font-mono font-bold uppercase tracking-widest bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all"
                    >
                        Retry Protocol
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-amber animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
            <header className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/10 border border-amber/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-amber uppercase tracking-[0.2em]">Financial Node</span>
                </div>
                <h1 className="text-5xl font-serif font-black text-ink tracking-tight">Billing & Plans</h1>
                <p className="text-[14px] font-mono text-neutral-500 max-w-2xl leading-relaxed">
                    Manage your synchronization protocols, view operational limits, and scale your cognitive infrastructure.
                </p>
            </header>

            <div className="space-y-8">
                <UpcomingPlan currentPlan={plan} />
                
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-ink/5" />
                        <h2 className="text-[10px] font-mono font-bold text-neutral-600 uppercase tracking-[0.3em]">Subscription Tiers</h2>
                        <div className="h-px flex-1 bg-ink/5" />
                    </div>
                    <PlanCard currentPlan={plan} />
                </section>
            </div>

            <PaymentHistory />

            <SubscriptionManagement currentPlan={plan} />

            {/* Notification Protocol */}
            <div className="group relative overflow-hidden bg-ink/5 border border-ink/5 rounded-4xl p-8 flex flex-col md:flex-row justify-between items-center gap-8 transition-all hover:border-ink/10">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-ink/2 border border-ink/5 flex items-center justify-center text-neutral-400 group-hover:text-ink transition-colors">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xl font-serif font-bold text-ink mb-1">Communication Protocol</p>
                        <p className="text-[13px] font-mono text-neutral-500">Receive synchronization receipts and billing updates directly to your terminal.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.open('/dashboard/billing#preferences', '_self')}
                    className="shrink-0 px-8 py-3.5 bg-ink/5 border border-ink/10 text-ink rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-ink/10 active:scale-[0.98] transition-all"
                >
                    Update Dispatch Rules
                </button>
            </div>
        </div>
    );
}
