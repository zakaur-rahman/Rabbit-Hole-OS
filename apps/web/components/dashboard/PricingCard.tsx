'use client';

import { Check, Sparkles, Loader2 } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { cn } from '@/lib/utils';

interface PricingCardProps {
    tier: string;
    price: string;
    description: string;
    features: string[];
    isCurrent?: boolean;
    isHighlighted?: boolean;
    onAction?: () => void;
    isLoading?: boolean;
    delay?: number;
}

export function PricingCard({
    tier,
    price,
    description,
    features,
    isCurrent = false,
    isHighlighted = false,
    onAction,
    isLoading = false,
    delay = 0,
}: PricingCardProps) {
    return (
        <DashboardCard 
            delay={delay} 
            className={cn(
                "relative flex flex-col h-full",
                isHighlighted && "border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
            )}
        >
            {isHighlighted && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-linear-to-r from-transparent via-amber/50 to-transparent" />
            )}
            
            <div className="flex justify-between items-start mb-8">
                <div>
                    <span className={cn(
                        "text-[10px] font-mono tracking-[0.2em] uppercase px-2.5 py-1 rounded-md mb-3 block w-fit",
                        isHighlighted ? "bg-amber/10 text-amber border border-amber/20" : "bg-white/5 text-neutral-500 border border-white/5"
                    )}>
                        {tier}
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-black text-white">{price}</span>
                        <span className="text-[12px] font-mono text-neutral-500">/mo</span>
                    </div>
                </div>
                {isHighlighted && (
                    <Sparkles className="w-5 h-5 text-amber animate-pulse" />
                )}
            </div>

            <p className="text-[13px] font-mono text-neutral-500 leading-relaxed mb-8">
                {description}
            </p>

            <ul className="space-y-4 mb-10 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 group/item">
                        <div className={cn(
                            "mt-1 p-0.5 rounded-full transition-colors",
                            isHighlighted ? "bg-amber/20 text-amber" : "bg-white/10 text-neutral-600"
                        )}>
                            <Check className="w-3 h-3" />
                        </div>
                        <span className="text-[13px] font-mono text-neutral-400 group-hover/item:text-neutral-200 transition-colors">
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onAction}
                disabled={isCurrent || isLoading}
                className={cn(
                    "w-full py-4 rounded-xl font-mono text-[12px] uppercase tracking-widest font-bold transition-all relative overflow-hidden group/btn px-4",
                    isCurrent 
                        ? "bg-neutral-900 text-neutral-500 border border-white/5 cursor-default"
                        : isHighlighted
                            ? "bg-white text-black hover:bg-neutral-200 active:scale-[0.98] shadow-lg shadow-white/5"
                            : "bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-[0.98]"
                )}
            >
                <div className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? 'Current Tier' : `Select ${tier}`}
                </div>
            </button>
        </DashboardCard>
    );
}
