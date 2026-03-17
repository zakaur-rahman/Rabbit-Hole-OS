"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdaptiveCursor } from "@/components/layout/AdaptiveCursor";

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide global nav/footer on dashboard and auth-related routes
    const isHiddenRoute = pathname.startsWith('/dashboard') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/auth');

    if (isHiddenRoute) {
        return <>{children}</>;
    }

    return (
        <>
            <AdaptiveCursor />
            <Navbar />
            <main className="flex-1 w-full">
                {children}
            </main>
            <Footer />
        </>
    );
}
