'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCcw, Hand, CheckCircle2, Loader2, Play } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PlanType } from '@/lib/constants';

interface SubscriptionManagementProps {
    currentPlan: PlanType;
    isCanceled?: boolean; // Mock flag if they are already in a churned state
}

export function SubscriptionManagement({ currentPlan, isCanceled = false }: SubscriptionManagementProps) {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isResubscribeModalOpen, setIsResubscribeModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Mock local state just for demo UI interactions
    const [uiStateCanceled, setUiStateCanceled] = useState(isCanceled);

    const isFree = currentPlan === 'free';

    // Handle Cancel Action
    const handleCancel = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setUiStateCanceled(true);
        setIsCancelModalOpen(false);
    };

    // Handle Pause Action
    const handlePause = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsCancelModalOpen(false);
        alert('Plan paused for 1 month.');
    };

    // Handle Resubscribe Action
    const handleResubscribe = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setUiStateCanceled(false);
        setIsResubscribeModalOpen(false);
    };

    if (isFree && !uiStateCanceled) {
        return null; // Free plans don't need cancellation management
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mt-8"
        >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                        {uiStateCanceled ? 'Subscription Inactive' : 'Subscription Management'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        {uiStateCanceled
                            ? "Your premium features have been revoked. Reactivate to regain access to advanced tools and higher limits."
                            : "Manage your active subscription. You can cancel your plan at any time, but you will lose access to premium features at the end of your billing cycle."}
                    </p>
                </div>

                <div className="shrink-0 flex gap-3">
                    {uiStateCanceled ? (
                        <button
                            onClick={() => setIsResubscribeModalOpen(true)}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reactivate Plan
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="bg-destructive/10 text-destructive border border-destructive/20 px-6 py-2.5 rounded-xl font-medium hover:bg-destructive/15 transition-colors flex items-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Cancel Subscription
                        </button>
                    )}
                </div>
            </div>

            {/* Cancel/Pause Modal */}
            <Modal
                isOpen={isCancelModalOpen}
                onClose={() => !isLoading && setIsCancelModalOpen(false)}
                title="Cancel Subscription"
                description="Are you sure you want to cancel? You will lose access to premium limits."
                destructive
            >
                <div className="space-y-6">
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl flex gap-3 items-start">
                        <Hand className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Wait! Consider Pausing Instead</p>
                            <p className="text-orange-400/80">Need a break? Pause your subscription for 1 month instead of canceling permanently. You won't be charged, and your configuration remains intact.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">If you proceed with cancellation:</div>
                        <ul className="text-sm space-y-2">
                            <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" /> Plan downgrades to Free tier at end of billing cycle.</li>
                            <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" /> Cloud API execution limits will drop to 100/mo.</li>
                            <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" /> Project limit enforced (max 3).</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={handlePause}
                            disabled={isLoading}
                            className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Pause for 1 Month
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancel'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Resubscribe Modal */}
            <Modal
                isOpen={isResubscribeModalOpen}
                onClose={() => !isLoading && setIsResubscribeModalOpen(false)}
                title="Welcome Back!"
                description="Reactivate your plan to restore full access."
            >
                <div className="space-y-6">
                    <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Win-back Offer Applied</p>
                            <p className="text-primary/80">Reactivate today and get 20% off your first 3 months as a thank you for returning!</p>
                        </div>
                    </div>

                    <div className="bg-secondary/50 rounded-xl p-4 flex justify-between items-center text-sm border border-border/50">
                        <div>
                            <p className="text-muted-foreground">Previous Plan</p>
                            <p className="font-bold text-foreground capitalize">{currentPlan} Tier</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground line-through decoration-destructive/50">$12.00</p>
                            <p className="font-bold text-primary">$9.60<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        </div>
                    </div>

                    <button
                        onClick={handleResubscribe}
                        disabled={isLoading}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reactivate Now'}
                    </button>
                </div>
            </Modal>
        </motion.div>
    );
}
