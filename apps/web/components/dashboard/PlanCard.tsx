'use client';

import { useState } from 'react';
import { PlanType } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { PricingCard } from './PricingCard';

interface PlanCardProps {
    currentPlan: PlanType;
}

export function PlanCard({ currentPlan }: PlanCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = async () => {
        try {
            setIsLoading(true);
            const res = await apiFetch('/billing/create-checkout-session', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
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

    const tiers = [
        {
            id: 'free',
            tier: 'Free Agent',
            price: '$0',
            description: 'Essential toolkit for individual cognitive researchers and hobbyists.',
            features: [
                '100 Nodes capacity',
                '1 Active Project',
                '500 API calls / mo',
                'Basic sync protocol',
                'Community support'
            ]
        },
        {
            id: 'pro',
            tier: 'Professional',
            price: '$12',
            description: 'Advanced capacity for power users and deep knowledge architects.',
            features: [
                '10,000 Nodes capacity',
                '20 Active Projects',
                '50,000 API calls / mo',
                'Priority sync execution',
                'Email support'
            ],
            highlighted: true
        },
        {
            id: 'team',
            tier: 'Enterprise',
            price: '$49',
            description: 'Infinite scalability for organizations and research institutes.',
            features: [
                'Unlimited Nodes',
                'Unlimited Projects',
                'Unlimited API calls',
                'Custom protocol rules',
                '24/7 dedicated support'
            ]
        }
    ];

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tiers.map((t, i) => (
                    <PricingCard
                        key={t.id}
                        tier={t.tier}
                        price={t.price}
                        description={t.description}
                        features={t.features}
                        isCurrent={currentPlan === t.id}
                        isHighlighted={t.highlighted}
                        delay={0.1 * (i + 1)}
                        isLoading={isLoading}
                        onAction={t.id === 'pro' ? handleUpgrade : handleManageBilling}
                    />
                ))}
            </div>
        </div>
    );
}
