import Image from "next/image";
import Link from "next/link";

export function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image
                    src="/logo.jpg"
                    alt="Cognode Logo"
                    fill
                    className="object-cover"
                    priority
                />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Cognode</span>
        </Link>
    );
}
