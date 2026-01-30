import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/layout/Logo";

const footerLinks = {
    product: [
        { label: "Features", href: "/#features" },
        { label: "Download", href: "/download" },
        { label: "Changelog", href: "/download#changelog" },
    ],
    company: [
        { label: "About", href: "/about" },
        { label: "Support", href: "/support" },
        { label: "Contact", href: "/support" },
    ],
    legal: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
    ],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
            <Container>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
                    <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                        <Logo />
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Turn connected knowledge into structured insight. The AI-powered desktop app for modern research.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Product</h3>
                        <ul className="space-y-2">
                            {footerLinks.product.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Company</h3>
                        <ul className="space-y-2">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Legal</h3>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Cognode. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        {/* Social icons placeholder */}
                    </div>
                </div>
            </Container>
        </footer>
    );
}
