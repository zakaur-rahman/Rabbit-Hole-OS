'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, AlertCircle, ArrowRight } from 'lucide-react';
import { PlanType } from '@/lib/constants';

interface UpcomingPlanProps {
    currentPlan: PlanType;
}

export function UpcomingPlan({ currentPlan }: UpcomingPlanProps) {
    // Mock Data based on plan type
    const isFree = currentPlan === 'free';
    const amountDue = isFree ? '$0.00' : currentPlan === 'pro' ? '$12.00' : '$49.00';
    const renewalDate = 'March 15, 2026';
    const cardInfo = 'Visa ending in 4242';
    const cardExpiryDate = useMemo(() => new Date('2026-05-01'), []); // Mock expiry date

    const [expiringSoon, setExpiringSoon] = useState(false);

    useEffect(() => {
        setExpiringSoon((cardExpiryDate.getTime() - Date.now()) < 60 * 24 * 60 * 60 * 1000);
    }, [cardExpiryDate]);

    if (isFree) return null; // No upcoming automated bill for free tier

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-primary/5 border border-primary/20 rounded-3xl p-8 relative overflow-hidden"
        >
            <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">

                {/* Billing Info */}
                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">Upcoming Billing</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Renewal Date</p>
                            <p className="font-semibold text-foreground text-lg">{renewalDate}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Amount Due</p>
                            <p className="font-semibold text-foreground text-lg">{amountDue} <span className="text-sm font-normal text-muted-foreground">/mo ({currentPlan} plan)</span></p>
                        </div>
                    </div>
                </div>

                <div className="w-px h-16 bg-border/50 hidden md:block mx-4" />

                {/* Payment Method / Action */}
                <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        {expiringSoon && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">
                                <AlertCircle className="w-3 h-3" /> Expiring Soon
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 bg-card/60 border border-white/5 rounded-xl p-3">
                        <div className="bg-secondary p-2 rounded-lg shrink-0">
                            <CreditCard className="w-5 h-5 text-foreground" />
                        </div>
                        <p className="text-sm font-medium flex-1">{cardInfo}</p>
                    </div>

                    <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1 pt-1">
                        Update payment method <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="mt-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
                        Have a promo code? <button className="underline hover:text-foreground">Apply it here</button>.
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
