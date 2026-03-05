'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { PlanType, PLAN_LIMITS } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

interface PlanCardProps {
    currentPlan: PlanType;
}

export function PlanCard({ currentPlan }: PlanCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = async () => {
        try {
            setIsLoading(true);
            // Mock Stripe Checkout call
            const res = await apiFetch('/billing/create-checkout-session', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                // Redirect to mock Stripe url
                if (data.url) window.location.href = data.url;
            }
        } catch (e) {
            console.error('Checkout failed', e);
            setIsLoading(false);
        }
    };

    const handleManageBilling = async () => {
        try {
            setIsLoading(true);
            // Mock Stripe Portal call
            const res = await apiFetch('/billing/portal', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.url) window.location.href = data.url;
            }
        } catch (e) {
            console.error('Portal failed', e);
            setIsLoading(false);
        }
    };

    // Render variables based on plan type
    const isFree = currentPlan === 'free';
    const isPro = currentPlan === 'pro';
    const isTeam = currentPlan === 'team';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Plan Overview */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />

                <div className="flex justify-between items-start mb-6 align-top">
                    <div>
                        <h2 className="text-xl font-bold text-foreground mb-1">Current Plan</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="capitalize font-semibold bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-xs">
                                {currentPlan}
                            </span>
                            Active
                        </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-muted-foreground/30" />
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Nodes Synced</span>
                        <span className="text-sm font-medium text-foreground">{PLAN_LIMITS[currentPlan].nodes === Infinity ? 'Unlimited' : PLAN_LIMITS[currentPlan].nodes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Projects</span>
                        <span className="text-sm font-medium text-foreground">{PLAN_LIMITS[currentPlan].projects === Infinity ? 'Unlimited' : PLAN_LIMITS[currentPlan].projects.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">API Requests/mo</span>
                        <span className="text-sm font-medium text-foreground">{PLAN_LIMITS[currentPlan].api_calls === Infinity ? 'Unlimited' : PLAN_LIMITS[currentPlan].api_calls.toLocaleString()}</span>
                    </div>
                </div>

                {(isPro || isTeam) ? (
                    <button
                        onClick={handleManageBilling}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-white/10 text-foreground font-medium py-3 rounded-xl transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Manage Billing'}
                    </button>
                ) : (
                    <div className="text-sm text-muted-foreground bg-white/5 p-4 rounded-xl">
                        You are currently on the free tier. Upgrade to unlock more capacity and projects.
                    </div>
                )}
            </motion.div>

            {/* Upgrade Call to Action */}
            {isFree && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-linear-to-b from-primary/10 to-transparent border border-primary/20 rounded-3xl p-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade to Pro</h2>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-black text-foreground">$12</span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        {['10,000 Nodes synched', '20 Active Projects', '50,000 API requests / month', 'Priority Support'].map(feature => (
                            <li key={feature} className="flex items-start gap-3">
                                <div className="p-1 bg-primary/20 rounded-full shrink-0">
                                    <Check className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-sm text-foreground">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleUpgrade}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upgrade Now'}
                    </button>
                </motion.div>
            )}

            {isPro && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center"
                >
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">You&apos;re a Pro!</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mb-6">
                        Thanks for supporting Cognode. You have access to expanded limits and premium features.
                    </p>
                    <button
                        disabled
                        className="px-6 py-2 bg-white/5 text-muted-foreground font-medium rounded-xl cursor-not-allowed"
                    >
                        Current Plan
                    </button>
                </motion.div>
            )}
        </div>
    );
}
