'use client';

import { PlanCard } from '@/components/dashboard/PlanCard';
import { UpcomingPlan } from '@/components/dashboard/UpcomingPlan';
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement';
import { PaymentHistory } from '@/components/dashboard/PaymentHistory';
import { PlanType } from '@/lib/constants';
import { useUser } from '@/components/providers/UserContext';
import { Loader2 } from 'lucide-react';

export default function BillingPage() {
    const { user, isLoading, error, reload } = useUser();
    const plan = (user?.plan as PlanType) || 'free';

    if (error) {
        return (
            <div className="p-6 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center gap-4 max-w-md mx-auto mt-16">
                <p className="text-sm text-center">{error}</p>
                <button onClick={reload} className="px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Billing & Plans</h1>
                <p className="text-muted-foreground">Manage your subscription, view current limits, and upgrade your account.</p>
            </div>

            {/* Top Level: Upcoming Bill & Current Plan details */}
            <div className="space-y-8">
                <UpcomingPlan currentPlan={plan} />
                <PlanCard currentPlan={plan} />
            </div>

            {/* Mid Level: Invoice History */}
            <PaymentHistory />

            {/* Bottom Level: Destructive / Lifecycle Actions */}
            <SubscriptionManagement currentPlan={plan} />

            {/* Email Preferences */}
            <div className="bg-card/20 border border-border/30 rounded-3xl p-6 flex justify-between items-center mt-6">
                <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive receipts and billing updates directly to your inbox.</p>
                </div>
                <button
                    onClick={() => window.open('/dashboard/billing#preferences', '_self')}
                    className="text-sm font-medium border border-border bg-secondary hover:bg-white/5 transition-colors px-4 py-2 rounded-lg"
                >
                    Manage Preferences
                </button>
            </div>
        </div>
    );
}
