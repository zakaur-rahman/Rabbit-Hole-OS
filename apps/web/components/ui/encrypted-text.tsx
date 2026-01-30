"use client";

import { useEffect, useState, useRef } from "react";
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
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset on text change
        indexRef.current = 0;
        setIsScrambling(true);
        setDisplayText("");

        let timer: NodeJS.Timeout;
        let revealTimer: NodeJS.Timeout;

        // Start reveal process
        revealTimer = setInterval(() => {
            if (indexRef.current < text.length) {
                indexRef.current += 1;
            } else {
                clearInterval(revealTimer);
                setIsScrambling(false);
            }
        }, revealDelayMs);

        // Scramble process
        timer = setInterval(() => {
            // If done, stop shuffling
            if (indexRef.current >= text.length) {
                clearInterval(timer);
                setDisplayText(text);
                return;
            }

            const currentText = text
                .split("")
                .map((char, i) => {
                    if (i < indexRef.current) {
                        return text[i];
                    }
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                })
                .join("");

            setDisplayText(currentText);
        }, intervalMs);

        // Initial output to prevent blank flash
        setDisplayText(
            text.split("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join("")
        );

        return () => {
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
            <span className={revealedClassName}>{displayText.substring(0, indexRef.current)}</span>
            <span className={encryptedClassName}>{displayText.substring(indexRef.current)}</span>
        </span>
    );
}
