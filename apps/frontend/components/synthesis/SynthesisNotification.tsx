'use client';

/**
 * SynthesisNotification — Floating card in the bottom-right of the canvas.
 *
 * Shows pipeline progress while running, completion/error state when done.
 * Provides "Open Report" and "View Logs" buttons on completion.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Terminal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSynthesisMonitorStore, AGENTS_CONFIG } from '@/store/synthesis-monitor.store';

interface SynthesisNotificationProps {
    onOpenReport: () => void;
    onViewLogs: () => void;
}

export default function SynthesisNotification({ onOpenReport, onViewLogs }: SynthesisNotificationProps) {
    const sessions = useSynthesisMonitorStore(s => s.sessions);
    const activeSessionId = useSynthesisMonitorStore(s => s.activeSessionId);
    const show = useSynthesisMonitorStore(s => s.showNotification);
    const dismiss = useSynthesisMonitorStore(s => s.dismissNotification);

    const activeSession = activeSessionId ? sessions[activeSessionId] : null;
    const status = activeSession?.pipelineStatus ?? 'idle';
    const progress = activeSession?.progress ?? 0;
    const activeAgentId = activeSession?.activeAgentId ?? null;
    const elapsedMs = activeSession?.elapsedMs ?? 0;
    const error = activeSession?.pipelineError ?? null;
    const agents = activeSession?.agents ?? {};

    // Cycling dot animation for active agent
    const [dotPhase, setDotPhase] = useState(0);
    useEffect(() => {
        if (status !== 'running') return;
        const id = setInterval(() => setDotPhase(p => (p + 1) % 3), 500);
        return () => clearInterval(id);
    }, [status]);

    if (!show || status === 'idle') return null;

    const activeAgent = activeAgentId ? agents[activeAgentId] : null;
    const elapsed = (elapsedMs / 1000).toFixed(1);
    const dots = '.'.repeat(dotPhase + 1);

    // Get completed agent count
    const completedCount = Object.values(agents).filter(a => a.status === 'completed').length;


    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 72,
                        width: 340,
                        zIndex: 9999,
                        fontFamily: "'DM Mono', monospace",
                        background: '#0f0e0c',
                        border: '1px solid rgba(200,134,10,0.25)',
                        overflow: 'hidden',
                    }}
                >
                    {/* amber top accent */}
                    <div style={{ height: 2, background: status === 'error' ? '#e05050' : status === 'completed' ? '#4caf7d' : '#c8860a' }} />

                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px 8px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {status === 'running' && (
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#c8860a',
                                    animation: 'synth-notif-pulse 1.4s ease-in-out infinite',
                                }} />
                            )}
                            {status === 'completed' && <CheckCircle2 size={14} style={{ color: '#4caf7d' }} />}
                            {status === 'error' && <AlertCircle size={14} style={{ color: '#e05050' }} />}
                            <span style={{
                                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                                color: status === 'error' ? '#e05050' : status === 'completed' ? '#4caf7d' : '#f0ece0',
                            }}>
                                {status === 'running' && 'Generating Report'}
                                {status === 'completed' && 'Report Ready'}
                                {status === 'error' && 'Generation Failed'}
                            </span>
                        </div>
                        <button
                            onClick={dismiss}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(240,236,224,0.3)', padding: 4,
                                display: 'flex', alignItems: 'center',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,224,0.7)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,224,0.3)')}
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '0 16px 14px' }}>
                        {/* Running state */}
                        {status === 'running' && (
                            <>
                                {/* Agent pipeline badges */}
                                <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10,
                                }}>
                                    {AGENTS_CONFIG.map(cfg => {
                                        const a = agents[cfg.id];
                                        const isActive = cfg.id === activeAgentId;
                                        const isDone = a?.status === 'completed';
                                        return (
                                            <span key={cfg.id} style={{
                                                fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
                                                padding: '3px 6px',
                                                border: `1px solid ${isActive ? 'rgba(200,134,10,0.4)' : isDone ? 'rgba(76,175,125,0.25)' : 'rgba(200,134,10,0.1)'}`,
                                                background: isActive ? 'rgba(200,134,10,0.1)' : isDone ? 'rgba(76,175,125,0.06)' : 'transparent',
                                                color: isActive ? '#e8a020' : isDone ? 'rgba(76,175,125,0.7)' : 'rgba(240,236,224,0.2)',
                                                transition: 'all 0.3s',
                                            }}>
                                                {cfg.name}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Current agent status */}
                                <div style={{
                                    fontSize: 10, color: 'rgba(200,134,10,0.6)',
                                    letterSpacing: '0.1em', marginBottom: 8,
                                }}>
                                    {activeAgent ? `${activeAgent.name}${dots}` : `Starting pipeline${dots}`}
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: 3, background: 'rgba(200,134,10,0.1)',
                                    marginBottom: 8, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%', background: '#c8860a',
                                        width: `${progress}%`,
                                        transition: 'width 0.5s ease-out',
                                    }} />
                                </div>

                                {/* Footer stats */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: 9, color: 'rgba(240,236,224,0.25)',
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                }}>
                                    <span>{completedCount}/{AGENTS_CONFIG.length} agents</span>
                                    <span>{elapsed}s</span>
                                </div>
                            </>
                        )}

                        {/* Completed state */}
                        {status === 'completed' && (
                            <>
                                <p style={{
                                    fontSize: 10, color: 'rgba(240,236,224,0.5)',
                                    letterSpacing: '0.08em', margin: '0 0 12px',
                                }}>
                                    Report generated successfully in {elapsed}s.
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={onOpenReport}
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            padding: '8px 12px',
                                            background: 'rgba(200,134,10,0.1)',
                                            border: '1px solid rgba(200,134,10,0.35)',
                                            color: '#c8860a',
                                            fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                                            fontFamily: "'DM Mono', monospace",
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,134,10,0.18)'; e.currentTarget.style.borderColor = 'rgba(200,134,10,0.6)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,134,10,0.1)'; e.currentTarget.style.borderColor = 'rgba(200,134,10,0.35)'; }}
                                    >
                                        <FileText size={11} /> Open Report
                                    </button>
                                    <button
                                        onClick={onViewLogs}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            padding: '8px 12px',
                                            background: 'none',
                                            border: '1px solid rgba(240,236,224,0.12)',
                                            color: 'rgba(240,236,224,0.5)',
                                            fontSize: 9, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase',
                                            fontFamily: "'DM Mono', monospace",
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(240,236,224,0.8)'; e.currentTarget.style.borderColor = 'rgba(240,236,224,0.25)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,236,224,0.5)'; e.currentTarget.style.borderColor = 'rgba(240,236,224,0.12)'; }}
                                    >
                                        <Terminal size={11} /> Logs
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Error state */}
                        {status === 'error' && (
                            <>
                                <p style={{
                                    fontSize: 10, color: 'rgba(220,80,60,0.7)',
                                    letterSpacing: '0.06em', margin: '0 0 10px',
                                    wordBreak: 'break-word',
                                }}>
                                    {error || 'An unexpected error occurred.'}
                                </p>
                                <button
                                    onClick={onViewLogs}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '7px 12px',
                                        background: 'none',
                                        border: '1px solid rgba(220,80,60,0.25)',
                                        color: 'rgba(220,80,60,0.7)',
                                        fontSize: 9, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase',
                                        fontFamily: "'DM Mono', monospace",
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    <Terminal size={11} /> View Logs
                                </button>
                            </>
                        )}
                    </div>

                    <style>{`
                        @keyframes synth-notif-pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.4; transform: scale(1.3); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
