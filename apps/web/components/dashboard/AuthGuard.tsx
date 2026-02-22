'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            router.replace('/login');
        } else {
            setIsAuthenticated(true);
            setIsChecking(false);
        }
    }, [router]);

    if (isChecking || !isAuthenticated) {
        return (
            <div className="fixed inset-0 min-h-screen bg-background flex flex-col items-center justify-center z-50">
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-accent/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <Loader2 className="w-8 h-8 text-accent animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2 tracking-tight">Loading Dashboard</h2>
                <p className="text-muted-foreground text-sm">Verifying your session...</p>
            </div>
        );
    }

    return <>{children}</>;
}
