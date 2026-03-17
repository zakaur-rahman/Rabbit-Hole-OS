import Link from "next/link";
import { CognodeLogo } from "@/components/ui/CognodeLogo";
import { cn } from "@/lib/utils";

export function Logo({ className, variant = 'light' }: { className?: string; variant?: 'light' | 'dark' }) {
    const isDark = variant === 'dark';
    
    return (
        <Link href="/" className={`flex items-center gap-3.5 group no-underline ${className || ''}`}>
            <div className="relative h-[26px] w-[26px] flex items-center justify-center transition-transform group-hover:scale-110">
                <CognodeLogo className={cn("w-full h-full", isDark ? "text-white" : "text-ink")} />
            </div>
            <span className={cn(
                "font-serif text-[20px] font-bold tracking-tight",
                isDark ? "text-white" : "text-ink"
            )}>
                Cognode
            </span>
        </Link>
    );
}
