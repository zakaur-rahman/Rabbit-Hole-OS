"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeToggle } from "../theme/ThemeToggle";

const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/privacy", label: "Privacy" },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav 
            className={cn(
                "fixed top-0 left-0 right-0 z-200 flex items-center justify-between transition-all duration-300 border-b border-rule",
                scrolled ? "py-4 px-6 md:px-12 bg-paper/90 backdrop-blur-xl" : "py-6 px-8 md:px-12 bg-paper/94 backdrop-blur-md"
            )}
        >
            <Logo />

            <ul className="hidden md:flex items-center gap-9 list-none m-0 p-0">
                {navLinks.map((link) => (
                    <li key={link.href}>
                        <Link 
                            href={link.href}
                            className="no-underline text-mid text-[11px] tracking-[0.12em] uppercase transition-colors hover:text-ink font-mono"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
                <li>
                    <Link 
                        href="/changelog"
                        className="no-underline text-ink text-[11px] tracking-[0.12em] uppercase font-mono border border-rule/50 px-4 py-2 hover:border-amber transition-all"
                    >
                        Changelog
                    </Link>
                </li>
                <li>
                    <ThemeToggle />
                </li>
                <li>
                    <Link 
                        href="/download"
                        className="bg-ink text-paper px-5 py-2 no-underline text-[11px] tracking-[0.15em] uppercase transition-all hover:bg-amber hover:text-ink font-mono"
                    >
                        Download v1.0
                    </Link>
                </li>
            </ul>

            {/* Mobile menu toggle would go here, keeping it simple for now as requested by the design snippet */}
        </nav>
    );
}
