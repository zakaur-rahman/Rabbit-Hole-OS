'use client';

import { useState } from 'react';
import AuthGuard from '@/components/dashboard/AuthGuard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { UserProvider } from '@/components/providers/UserContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <AuthGuard>
            <UserProvider>
                <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">

                    {/* Abstract Background */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
                    </div>

                    {/* Desktop Sidebar */}
                    <div className="relative z-20 shrink-0 hidden md:block">
                        <Sidebar />
                    </div>

                    {/* Mobile Sidebar Drawer */}
                    <AnimatePresence>
                        {mobileNavOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setMobileNavOpen(false)}
                                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
                                />
                                <motion.div
                                    initial={{ x: -280 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: -280 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="fixed top-0 left-0 z-50 md:hidden"
                                >
                                    <Sidebar onNavigate={() => setMobileNavOpen(false)} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col relative z-10 w-full min-w-0">
                        <Topbar onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />

                        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                            <div className="max-w-6xl mx-auto w-full">
                                {children}
                            </div>
                        </main>
                    </div>

                </div>
            </UserProvider>
        </AuthGuard>
    );
}
