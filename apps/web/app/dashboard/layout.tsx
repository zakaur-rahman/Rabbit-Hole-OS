'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/dashboard/AuthGuard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { DesktopBanner } from '@/components/dashboard/DesktopBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [desktopAuthCode, setDesktopAuthCode] = useState<string | null>(null);

    useEffect(() => {
        // Check if there's a pending desktop auth handoff triggered by the OAuth callback
        const pendingCode = localStorage.getItem('pending_desktop_auth_code');
        if (pendingCode) {
            setDesktopAuthCode(pendingCode);
        }
    }, []);

    return (
        <AuthGuard>
            {desktopAuthCode && <DesktopBanner desktopAuthCode={desktopAuthCode} />}

            <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">

                {/* Abstract Background for the entire Dashboard (behind everything) */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
                </div>

                {/* Left fixed Sidebar */}
                <div className="relative z-20 shrink-0 hidden md:block">
                    <Sidebar />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative z-10 w-full min-w-0">
                    <Topbar />

                    <main className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
                </div>

            </div>
        </AuthGuard>
    );
}
