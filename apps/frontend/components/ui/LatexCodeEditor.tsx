'use client';

import React, { useRef, useEffect, useCallback } from 'react';
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
        if (errors.length > 0 && textareaRef.current) {
            const firstErrorLine = Math.min(...errors.map(e => e.line).filter(l => l > 0));
            if (firstErrorLine > 0) {
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

    const highlightText = (text: string) => {
        // Escape HTML
        let highlighted = text
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
    };

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
                    dangerouslySetInnerHTML={{ __html: highlightText(value) }}
                />

                {/* Error Markers Overlay */}
                <div data-error-overlay style={{ ...styles.errorOverlay }}>
                    {errors.map((error, idx) => (
                        <div
                            key={idx}
                            style={{
                                ...styles.errorMarker,
                                top: `${(error.line - 1) * 1.5}em`, // Must match lineHeight
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
        backgroundColor: '#0f0f1a',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        overflow: 'hidden',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '13px',
        position: 'relative',
        height: '100%',
        minHeight: 0,
    } as React.CSSProperties,
    lineNumbers: {
        width: '55px',
        backgroundColor: '#161625',
        color: '#4b5563',
        textAlign: 'right' as const,
        padding: '15px 0',
        userSelect: 'none' as const,
        borderRight: '1px solid #1e1e2e',
        overflowY: 'hidden',
        lineHeight: '1.5',
    } as React.CSSProperties,
    lineNumber: {
        height: '1.5em',
        lineHeight: '1.5em',
    } as React.CSSProperties,
    editorArea: {
        flex: 1,
        position: 'relative' as const,
        overflow: 'hidden',
    } as React.CSSProperties,
    textarea: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        padding: '15px',
        backgroundColor: 'transparent',
        color: 'transparent',
        caretColor: '#fff',
        border: 'none',
        outline: 'none',
        resize: 'none' as const,
        zIndex: 2,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.5',
        whiteSpace: 'pre' as const,
        overflow: 'auto',
    } as React.CSSProperties,
    pre: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        padding: '15px',
        margin: 0,
        pointerEvents: 'none' as const,
        zIndex: 1,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.5',
        color: '#d4d4d8',
        whiteSpace: 'pre' as const,
        overflow: 'hidden',
    } as React.CSSProperties,
    errorOverlay: {
        position: 'absolute' as const,
        top: 0, // Changed to 0 as we use em offsets
        left: 0,
        width: '100%',
        pointerEvents: 'none' as const,
        zIndex: 3,
        paddingTop: '15px', // Match text area padding
    } as React.CSSProperties,
    errorMarker: {
        position: 'absolute' as const,
        left: 0,
        width: '100%',
        height: '1.5em',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderLeft: '2px solid #ef4444',
        pointerEvents: 'none' as const,
    } as React.CSSProperties,
    errorTooltip: {
        position: 'absolute' as const,
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#ef4444',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        opacity: 1,
        pointerEvents: 'auto' as const,
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 10,
    } as React.CSSProperties,
};
