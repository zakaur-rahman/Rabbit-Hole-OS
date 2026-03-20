'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface LatexCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    errors?: { line: number; message: string; context?: string }[];
}

export default function LatexCodeEditor({ value, onChange, errors = [] }: LatexCodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to first error when errors change
    useEffect(() => {
        const positiveLineErrors = errors.filter(e => e.line > 0);
        if (positiveLineErrors.length > 0 && textareaRef.current) {
            const firstErrorLine = Math.min(...positiveLineErrors.map(e => e.line));
            if (firstErrorLine > 0 && isFinite(firstErrorLine)) {
                // Calculate position: (lineHeight * (line - 1)) + padding
                const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight || '20');
                const scrollPos = (lineHeight * (firstErrorLine - 1)) + 15 - 50; // Scroll target with some offset
                textareaRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
        }
    }, [errors]);

    const handleScroll = useCallback(() => {
        if (textareaRef.current && preRef.current && lineNumbersRef.current) {
            const scrollTop = textareaRef.current.scrollTop;
            const scrollLeft = textareaRef.current.scrollLeft;

            preRef.current.scrollTop = scrollTop;
            preRef.current.scrollLeft = scrollLeft;
            lineNumbersRef.current.scrollTop = scrollTop;

            // Sync error overlay if it exists
            const errorOverlay = textareaRef.current.parentElement?.querySelector('[data-error-overlay]');
            if (errorOverlay) {
                (errorOverlay as HTMLElement).style.transform = `translateY(-${scrollTop}px)`;
            }
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            onChange(newValue);

            // Set cursor position after React re-renders
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
            });
        }
    };

    const highlightedHtml = useMemo(() => {
        // Escape HTML
        let highlighted = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // LaTeX commands: \command
        highlighted = highlighted.replace(/(\\([a-zA-Z]+|\\[^{]))/g, '<span style="color: #c678dd;">$1</span>');

        // Arguments: {arg}
        highlighted = highlighted.replace(/(\{)([^{}]+)(\})/g, '$1<span style="color: #98c379;">$2</span>$3');

        // Math mode: $...$
        highlighted = highlighted.replace(/(\$[^$]+\$)/g, '<span style="color: #d19a66;">$1</span>');

        // Comments: % comment
        highlighted = highlighted.replace(/(%.*)/g, '<span style="color: #5c6370; font-style: italic;">$1</span>');

        return highlighted + '\n'; // Extra newline to match textarea height
    }, [value]);

    const lines = value.split('\n');
    const numLines = Math.max(lines.length, 1);

    return (
        <div style={styles.container}>
            {/* Line Numbers Column */}
            <div style={styles.lineNumbers} ref={lineNumbersRef}>
                {Array.from({ length: numLines }).map((_, i) => {
                    const lineErrors = errors.filter(e => e.line === i + 1);
                    return (
                        <div key={i} style={{
                            ...styles.lineNumber,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            color: lineErrors.length > 0 ? '#ef4444' : '#4b5563',
                            backgroundColor: lineErrors.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                            fontWeight: lineErrors.length > 0 ? '600' : '400',
                            paddingRight: '8px',
                        }}>
                            {lineErrors.length > 0 && (
                                <AlertCircle size={10} style={{ marginRight: '4px', color: '#ef4444' }} />
                            )}
                            {i + 1}
                        </div>
                    );
                })}
            </div>

            {/* Editor Area */}
            <div style={styles.editorArea}>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    style={styles.textarea}
                    spellCheck={false}
                    wrap="off"
                />
                <pre
                    ref={preRef}
                    aria-hidden="true"
                    style={styles.pre}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />

                {/* Error Markers Overlay */}
                <div data-error-overlay style={{ ...styles.errorOverlay }}>
                    {errors.map((error, idx) => (
                        <div
                            key={idx}
                            style={{
                                ...styles.errorMarker,
                                top: `${(error.line - 1) * 1.6}em`, // Must match lineHeight
                                display: error.line > 0 ? 'block' : 'none'
                            }}
                            title={error.message}
                        >
                            <div style={styles.errorTooltip}>
                                <AlertCircle size={12} style={{ marginRight: '6px' }} />
                                {error.message}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flex: 1,
        backgroundColor: 'var(--synth-surface)',
        borderRadius: '16px',
        border: '1px solid var(--synth-border)',
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        position: 'relative',
        height: '100%',
        minHeight: 0,
    } as React.CSSProperties,
    lineNumbers: {
        width: '56px',
        backgroundColor: 'var(--synth-surface-raised)',
        color: 'var(--synth-text-muted)',
        textAlign: 'right' as const,
        padding: '20px 0',
        userSelect: 'none' as const,
        borderRight: '1px solid var(--synth-border)',
        overflowY: 'hidden',
        lineHeight: '1.6',
        fontSize: '11px',
        fontWeight: 600,
    } as React.CSSProperties,
    lineNumber: {
        height: '1.6em',
        lineHeight: '1.6em',
    } as React.CSSProperties,
    editorArea: {
        flex: 1,
        position: 'relative' as const,
        overflow: 'hidden',
        backgroundColor: 'var(--synth-surface)',
    } as React.CSSProperties,
    textarea: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        padding: '20px',
        backgroundColor: 'transparent',
        color: 'transparent',
        caretColor: 'var(--synth-primary-400)',
        border: 'none',
        outline: 'none',
        resize: 'none' as const,
        zIndex: 2,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.6',
        whiteSpace: 'pre' as const,
        overflow: 'auto',
    } as React.CSSProperties,
    pre: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        padding: '20px',
        margin: 0,
        pointerEvents: 'none' as const,
        zIndex: 1,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.6',
        color: 'var(--synth-text-secondary)',
        whiteSpace: 'pre' as const,
        overflow: 'hidden',
    } as React.CSSProperties,
    errorOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        pointerEvents: 'none' as const,
        zIndex: 3,
        paddingTop: '20px',
    } as React.CSSProperties,
    errorMarker: {
        position: 'absolute' as const,
        left: 0,
        width: '100%',
        height: '1.6em',
        backgroundColor: 'var(--synth-error-light)',
        borderLeft: '2px solid var(--synth-error)',
        pointerEvents: 'none' as const,
    } as React.CSSProperties,
    errorTooltip: {
        position: 'absolute' as const,
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: 'var(--synth-error)',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        boxShadow: 'var(--synth-shadow-sm)',
        opacity: 1,
        pointerEvents: 'auto' as const,
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 10,
        letterSpacing: '0.02em',
    } as React.CSSProperties,
};
