'use client';

import { Calendar, CreditCard, AlertCircle, ArrowRight } from 'lucide-react';
import { PlanType } from '@/lib/constants';
import { DashboardCard } from './DashboardCard';

interface UpcomingPlanProps {
    currentPlan: PlanType;
}

export function UpcomingPlan({ currentPlan }: UpcomingPlanProps) {
    if (currentPlan === 'free') return null;

    const amountDue = currentPlan === 'pro' ? '$12.00' : '$49.00';
    const renewalDate = 'March 15, 2026';
    const cardInfo = 'Visa ending in 4242';
    const isExpiringSoon = true; // Hardcoded for demo/premium look

    return (
        <DashboardCard hover={false} className="bg-amber/5 border-amber/10 p-0 overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                {/* Billing Summary */}
                <div className="flex-[1.5] p-8 border-b lg:border-b-0 lg:border-r border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber/10 text-amber">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-serif font-black text-white">Upcoming Cycle</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Protocol Renewal</span>
                            <p className="text-lg font-mono text-white">{renewalDate}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Amount Due</span>
                            <p className="text-lg font-mono text-white">
                                {amountDue} <span className="text-[10px] text-neutral-500 capitalize">({currentPlan})</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment & Actions */}
                <div className="flex-1 p-8 bg-white/2 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Active Method</span>
                        {isExpiringSoon && (
                            <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-tighter">
                                <AlertCircle className="w-3 h-3" /> Potential Expiry
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 bg-neutral-900 border border-white/5 rounded-xl p-4">
                        <div className="bg-white/5 p-2 rounded-lg text-neutral-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <p className="text-[13px] font-mono text-neutral-300">{cardInfo}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button className="text-[11px] font-mono text-amber hover:text-white transition-colors flex items-center gap-2 group w-fit">
                            <span>Modify Payment Protocol</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-[11px] font-mono text-neutral-600">
                            Have a cryptographic voucher? <button className="text-neutral-400 hover:text-white underline underline-offset-4">Apply code</button>.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardCard>
    );
}
