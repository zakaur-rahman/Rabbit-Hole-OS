"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface EncryptedTextProps {
    text: string;
    className?: string;
    encryptedClassName?: string;
    revealedClassName?: string;
    revealDelayMs?: number; // Time per character to reveal
    intervalMs?: number; // Speed of shuffling
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

export function EncryptedText({
    text,
    className,
    encryptedClassName,
    revealedClassName,
    revealDelayMs = 50,
    intervalMs = 30,
}: EncryptedTextProps) {
    const [displayText, setDisplayText] = useState("");
    const [isScrambling, setIsScrambling] = useState(true);
    const [indexPos, setIndexPos] = useState(0);

    useEffect(() => {
        // Reset on text change
        const resetTimer = setTimeout(() => {
            setIndexPos(0);
            setIsScrambling(true);
            // Initial output to prevent blank flash
            setDisplayText(
                text.split("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join("")
            );
        }, 0);

        const revealTimer = setInterval(() => {
            setIndexPos((prev) => {
                if (prev < text.length) {
                    return prev + 1;
                } else {
                    clearInterval(revealTimer);
                    setIsScrambling(false);
                    return prev;
                }
            });
        }, revealDelayMs);

        const timer = setInterval(() => {
            setIndexPos((currentIndex) => {
                // If done, stop shuffling
                if (currentIndex >= text.length) {
                    clearInterval(timer);
                    setDisplayText(text);
                    return currentIndex;
                }

                const currentText = text
                    .split("")
                    .map((char, i) => {
                        if (i < currentIndex) {
                            return text[i];
                        }
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join("");

                setDisplayText(currentText);
                return currentIndex;
            });
        }, intervalMs);



        return () => {
            clearTimeout(resetTimer);
            clearInterval(timer);
            clearInterval(revealTimer);
        };
    }, [text, revealDelayMs, intervalMs]);

    // Once fully revealed, just show static text to save perf
    if (!isScrambling) {
        return <span className={cn(className, revealedClassName)}>{text}</span>;
    }

    return (
        <span className={cn(className)}>
            <span className={revealedClassName}>{displayText.substring(0, indexPos)}</span>
            <span className={encryptedClassName}>{displayText.substring(indexPos)}</span>
        </span>
    );
}
