'use client';

import { useState } from 'react';
import { ShieldAlert, RefreshCcw, Hand, CheckCircle2, Loader2, Play } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PlanType } from '@/lib/constants';
import { DashboardCard } from './DashboardCard';

interface SubscriptionManagementProps {
    currentPlan: PlanType;
    isCanceled?: boolean; 
}

export function SubscriptionManagement({ currentPlan, isCanceled = false }: SubscriptionManagementProps) {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isResubscribeModalOpen, setIsResubscribeModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uiStateCanceled, setUiStateCanceled] = useState(isCanceled);
    const [pauseSuccess, setPauseSuccess] = useState(false);

    const isFree = currentPlan === 'free';

    const handleCancel = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setUiStateCanceled(true);
        setIsCancelModalOpen(false);
    };

    const handlePause = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsCancelModalOpen(false);
        setPauseSuccess(true);
        setTimeout(() => setPauseSuccess(false), 5000);
    };

    const handleResubscribe = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setUiStateCanceled(false);
        setIsResubscribeModalOpen(false);
    };

    if (isFree && !uiStateCanceled) return null;

    return (
        <DashboardCard delay={0.2} className="mt-8">
            {pauseSuccess && (
                <div className="mb-8 flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[13px] font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <p>Subsystem hibernation engaged for 1 cycle. Operational charges suspended.</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-8">
                <div className="space-y-2">
                    <h3 className="text-xl font-serif font-black text-white">
                        {uiStateCanceled ? 'Subsystem Terminated' : 'Protocol Lifecycle'}
                    </h3>
                    <p className="text-[13px] font-mono text-neutral-500 max-w-xl leading-relaxed">
                        {uiStateCanceled
                            ? "Cognitive uplift modules have been de-indexed. Reactivate the synchronization protocol to restore high-order node access."
                            : "Manage your active subscription protocol. Termination resets your capacity to baseline levels at the conclusion of the current cycle."}
                    </p>
                </div>

                <div className="shrink-0">
                    {uiStateCanceled ? (
                        <button
                            onClick={() => setIsResubscribeModalOpen(true)}
                            className="bg-white text-black px-6 py-3 rounded-xl font-mono text-[11px] font-bold hover:bg-neutral-200 transition-all uppercase tracking-widest flex items-center gap-2"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Engagement Reactivation
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-6 py-3 rounded-xl font-mono text-[11px] font-bold hover:bg-rose-500/20 transition-all uppercase tracking-widest flex items-center gap-2"
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Terminate Protocol
                        </button>
                    )}
                </div>
            </div>

            {/* Cancel/Pause Modal */}
            <Modal
                isOpen={isCancelModalOpen}
                onClose={() => !isLoading && setIsCancelModalOpen(false)}
                title="Protocol Termination"
                description="Analysis of termination consequences required."
                destructive
            >
                <div className="space-y-6 pt-4">
                    <div className="bg-amber/10 border border-amber/20 text-amber p-4 rounded-xl flex gap-3 items-start">
                        <Hand className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-[13px] font-mono">
                            <p className="font-bold mb-1 uppercase tracking-tight">Pause Recommended</p>
                            <p className="text-amber/70">Engagement can be suspended for 1 cycle without data de-indexing. Retain all node configurations during hibernation.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">Termination Impact:</div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 items-center text-[13px] font-mono text-neutral-400">
                                <div className="w-1 h-1 rounded-full bg-rose-500 shrink-0" /> 
                                Node capacity reverts to baseline (100)
                            </li>
                            <li className="flex gap-3 items-center text-[13px] font-mono text-neutral-400">
                                <div className="w-1 h-1 rounded-full bg-rose-500 shrink-0" /> 
                                API throughput restricted to 500/cycle
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            onClick={handlePause}
                            disabled={isLoading}
                            className="flex-1 bg-white/5 text-white border border-white/10 py-3.5 rounded-xl font-mono text-[11px] font-bold hover:bg-white/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Pause Protocol
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="flex-1 bg-rose-500 text-white py-3.5 rounded-xl font-mono text-[11px] font-bold hover:bg-rose-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Termination'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Resubscribe Modal */}
            <Modal
                isOpen={isResubscribeModalOpen}
                onClose={() => !isLoading && setIsResubscribeModalOpen(false)}
                title="Welcome Back"
                description="Re-indexing project data and protocol state."
            >
                <div className="space-y-6 pt-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-[13px] font-mono">
                            <p className="font-bold mb-1 uppercase tracking-tight">Priority Re-engagement</p>
                            <p className="text-emerald-500/70">Reactivate within 72 cycles to receive dynamic capacity scaling bonuses.</p>
                        </div>
                    </div>

                    <div className="bg-neutral-900 border border-white/5 rounded-xl p-5 flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Selected Tier</p>
                            <p className="text-lg font-serif font-black text-white capitalize">{currentPlan} Protocol</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] font-mono text-neutral-500 line-through decoration-rose-500/50">$12.00</p>
                            <p className="text-2xl font-serif font-black text-amber">$9.60<span className="text-[10px] font-mono text-neutral-500">/mo</span></p>
                        </div>
                    </div>

                    <button
                        onClick={handleResubscribe}
                        disabled={isLoading}
                        className="w-full bg-white text-black py-4 rounded-xl font-mono text-[11px] font-bold hover:bg-neutral-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Engage Reactivation'}
                    </button>
                </div>
            </Modal>
        </DashboardCard>
    );
}
