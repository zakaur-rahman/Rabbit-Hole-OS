import Link from "next/link";
import { CognodeLogo } from "@/components/ui/CognodeLogo";

export function Logo({ className }: { className?: string }) {
    return (
        <Link href="/" className={`flex items-center gap-3 group no-underline ${className || ''}`}>
            <div className="relative h-7 w-7 flex items-center justify-center transition-transform group-hover:scale-105">
                <CognodeLogo className="w-full h-full text-amber" />
            </div>
            <span className="font-serif text-[19px] font-bold tracking-tight text-ink">Cognode</span>
        </Link>
    );
}
