import { Container } from "@/components/ui/Container";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Download } from "lucide-react";

export function CTA() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] opacity-50 pointer-events-none" />

            <Container className="relative">
                <div className="max-w-4xl mx-auto text-center space-y-8 p-12 rounded-3xl border border-primary/20 bg-background/50 backdrop-blur-xl">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                        Ready to Upgrade Your Mind?
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Join thousands of researchers and developers who trust Cognode for their most critical work.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/download"
                            className={cn(
                                buttonVariants({ size: "lg" }),
                                "h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl transition-all rounded-full flex items-center gap-2"
                            )}
                        >
                            <Download className="h-5 w-5" />
                            Download Cognode v1.0
                        </Link>
                    </div>
                    <p className="text-sm text-muted-foreground pt-4">
                        Available for macOS and Windows. securely offline.
                    </p>
                </div>
            </Container>
        </section>
    );
}
