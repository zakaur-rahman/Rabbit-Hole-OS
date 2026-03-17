import Link from "next/link";
import { Logo } from "./Logo";

const footerLinks = {
    product: [
        { label: "Features", href: "/features" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Download", href: "/download" },
        { label: "Changelog", href: "/changelog" },
    ],
    company: [
        { label: "About", href: "/about" },
        { label: "Support", href: "/support" },
        { label: "Contact", href: "/support" },
    ],
    legal: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
    ],
};

export function Footer() {
    return (
        <>
            <footer className="border-t border-rule bg-cream py-11 px-6 md:px-12 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-11">
                <div className="flex flex-col gap-3">
                    <Logo />
                    <p className="text-mid text-[11px] leading-[1.8] max-w-[250px] font-mono">
                        Turn connected knowledge into structured insight. The AI-powered desktop app for modern research.
                    </p>
                </div>

                {Object.entries(footerLinks).map(([title, links]) => (
                    <div key={title} className="flex flex-col gap-4">
                        <h4 className="text-ink text-[10px] tracking-[0.2em] uppercase m-0 pb-2 border-b border-rule font-mono">
                            {title}
                        </h4>
                        <ul className="list-none m-0 p-0 flex flex-col gap-2">
                            {links.map((link) => (
                                <li key={link.label}>
                                    <Link 
                                        href={link.href} 
                                        className="no-underline text-mid text-[11px] transition-colors hover:text-ink font-mono"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </footer>
            <div className="border-t border-rule bg-cream py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-mid tracking-[0.08em] font-mono">
                <span>© {new Date().getFullYear()} Cognode. All rights reserved.</span>
                <span>v1.0 · macOS & Windows</span>
            </div>
        </>
    );
}
