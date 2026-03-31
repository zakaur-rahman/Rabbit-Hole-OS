'use client';

/**
 * SynthesisMonitorPanel — Full-screen AI orchestration console.
 *
 * Three-column layout:
 *   Left   — Agent list with status indicators
 *   Center — Real-time log stream with auto-scroll
 *   Right  — Agent response inspector with tabs
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Play, Pause, Clock, Cpu, Zap,
    ChevronRight, Terminal, FileText, Code2,
} from 'lucide-react';
import {
    useSynthesisMonitorStore,
    AGENTS_CONFIG,
    type AgentStatus,
    type LogEntry,
} from '@/store/synthesis-monitor.store';
import { useGraphStore } from '@/store/graph.store';

// ── Color tokens ─────────────────────────────────────────────────────────────

const C = {
    paper:    '#0f0e0c',
    surface:  '#111009',
    raised:   '#171510',
    border:   'rgba(200,134,10,.2)',
    borderHi: 'rgba(200,134,10,.45)',
    amber:    '#c8860a',
    amberL:   '#e8a020',
    amberDim: 'rgba(200,134,10,.08)',
    text:     '#f0ece0',
    textMid:  'rgba(240,236,224,.6)',
    textMuted:'rgba(240,236,224,.35)',
    green:    '#4caf7d',
    warning:  '#e8a020',
    danger:   '#e05050',
};

const STATUS_COLORS: Record<AgentStatus, string> = {
    idle:      'rgba(240,236,224,.15)',
    running:   C.amber,
    completed: C.green,
    warning:   C.warning,
    error:     C.danger,
};

const LOG_TYPE_COLORS: Record<string, string> = {
    step:  C.amber,
    info:  C.textMid,
    ok:    C.green,
    warn:  C.warning,
    error: C.danger,
};

// ── Agent List Item ──────────────────────────────────────────────────────────

interface AgentItemProps {
    agentId: string;
    name: string;
    role: string;
    status: AgentStatus;
    executionTimeMs: number | null;
    model: string | null;
    tokenUsage: number;
    isSelected: boolean;
    onClick: () => void;
}

const AgentItem = React.memo(({ agentId, name, role, status, executionTimeMs, model, tokenUsage, isSelected, onClick }: AgentItemProps) => {
    const timeStr = executionTimeMs !== null ? `${(executionTimeMs / 1000).toFixed(1)}s` : '—';

    return (
        <div
            onClick={onClick}
            style={{
                padding: '10px 14px',
                borderLeft: `2px solid ${isSelected ? C.amber : 'transparent'}`,
                background: isSelected ? C.amberDim : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.18s',
                borderBottom: `1px solid ${C.border}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {/* Status dot */}
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: STATUS_COLORS[status],
                    flexShrink: 0,
                    animation: status === 'running' ? 'sm-pulse 1.4s ease-in-out infinite' : 'none',
                }} />
                <span style={{
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
                    color: isSelected ? C.amber : C.text,
                    fontFamily: "'DM Mono', monospace",
                }}>
                    {name}
                </span>
                <span style={{
                    fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: STATUS_COLORS[status],
                    marginLeft: 'auto',
                    fontFamily: "'DM Mono', monospace",
                }}>
                    {status}
                </span>
            </div>
            <div style={{
                fontSize: 9, letterSpacing: '0.1em', color: C.textMuted,
                fontFamily: "'DM Mono', monospace",
                marginBottom: 4,
            }}>
                {role}
            </div>
            <div style={{
                display: 'flex', gap: 12,
                fontSize: 8, letterSpacing: '0.1em', color: C.textMuted,
                fontFamily: "'DM Mono', monospace",
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={8} /> {timeStr}
                </span>
                {model && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Cpu size={8} /> {model}
                    </span>
                )}
                {tokenUsage > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={8} /> {tokenUsage}
                    </span>
                )}
            </div>
        </div>
    );
});
AgentItem.displayName = 'AgentItem';

// ── Log Row ──────────────────────────────────────────────────────────────────

const LogRow = React.memo(({ log }: { log: LogEntry }) => (
    <div style={{
        display: 'flex', gap: 10, padding: '4px 16px',
        fontSize: 10, fontFamily: "'DM Mono', monospace",
        lineHeight: 1.8, borderBottom: '1px solid rgba(200,134,10,0.04)',
    }}>
        <span style={{ color: C.textMuted, flexShrink: 0, width: 60 }}>{log.timestamp}</span>
        <span style={{
            color: LOG_TYPE_COLORS[log.logType] || C.textMid,
            flexShrink: 0, width: 85,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}>
            {log.agent}
        </span>
        <span style={{
            color: LOG_TYPE_COLORS[log.logType] || C.textMid,
            flexShrink: 0, width: 36,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: 8,
        }}>
            {log.logType}
        </span>
        <span style={{ color: C.text, flex: 1, wordBreak: 'break-word' }}>{log.message}</span>
    </div>
));
LogRow.displayName = 'LogRow';

// ── Main Component ───────────────────────────────────────────────────────────

interface SynthesisMonitorPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SynthesisMonitorPanel({ isOpen, onClose }: SynthesisMonitorPanelProps) {
    const agents = useSynthesisMonitorStore(s => s.agents);
    const logs = useSynthesisMonitorStore(s => s.logs);
    const selectedAgentId = useSynthesisMonitorStore(s => s.selectedAgentId);
    const agentResponses = useSynthesisMonitorStore(s => s.agentResponses);
    const pipelineStatus = useSynthesisMonitorStore(s => s.pipelineStatus);
    const progress = useSynthesisMonitorStore(s => s.progress);
    const elapsedMs = useSynthesisMonitorStore(s => s.elapsedMs);
    const jobId = useSynthesisMonitorStore(s => s.jobId);
    const selectAgent = useSynthesisMonitorStore(s => s.selectAgent);
    const nodes = useGraphStore(s => s.nodes);

    const [autoScroll, setAutoScroll] = useState(true);
    const [inspectorTab, setInspectorTab] = useState<'response' | 'prompt' | 'json'>('response');
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const handleAgentClick = useCallback((agentId: string) => {
        selectAgent(agentId);
        setInspectorTab('response');
    }, [selectAgent]);

    if (!isOpen) return null;

    const selectedResponse = selectedAgentId ? agentResponses[selectedAgentId] : null;
    const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
    const elapsed = (elapsedMs / 1000).toFixed(1);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 999998,
                background: 'rgba(10,9,6,.92)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes sm-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.35)} }
                @keyframes sm-sweep { to { left: 140%; } }
                .sm-tab { font-family:'DM Mono',monospace; font-size:9px; font-weight:400; letter-spacing:.14em; text-transform:uppercase; padding:8px 14px; cursor:pointer; background:none; border:none; border-bottom:2px solid transparent; transition:all .2s; color:rgba(240,236,224,.35); }
                .sm-tab:hover { color: #c8860a; }
                .sm-tab.active { color:#c8860a; border-bottom-color:#c8860a; background:rgba(200,134,10,.06); }
            `}</style>

            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                style={{
                    width: '94vw', height: '88vh',
                    background: C.paper,
                    border: `1px solid ${C.border}`,
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Corner brackets */}
                {(['tl','tr','bl','br'] as const).map(pos => (
                    <span key={pos} style={{
                        position: 'absolute', width: 10, height: 10,
                        borderStyle: 'solid', borderColor: C.borderHi, zIndex: 10,
                        ...(pos === 'tl' ? { top:0, left:0,  borderWidth:'1.5px 0 0 1.5px' } :
                            pos === 'tr' ? { top:0, right:0, borderWidth:'1.5px 1.5px 0 0' } :
                            pos === 'bl' ? { bottom:0, left:0,  borderWidth:'0 0 1.5px 1.5px' } :
                                           { bottom:0, right:0, borderWidth:'0 1.5px 1.5px 0' }),
                    }} />
                ))}

                {/* ── TOP BAR ── */}
                <div style={{
                    height: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px',
                    background: C.surface,
                    borderBottom: `1px solid ${C.border}`,
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Terminal size={14} style={{ color: C.amber }} />
                        <div>
                            <div style={{
                                fontFamily: "'Playfair Display',serif",
                                fontSize: 14, fontWeight: 700, color: C.text,
                                letterSpacing: '-.01em', lineHeight: 1,
                            }}>
                                Synthesis Monitor
                            </div>
                            <div style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                                color: C.textMuted, marginTop: 2,
                            }}>
                                {pipelineStatus === 'running' ? `Running · ${elapsed}s · ${progress}%` :
                                 pipelineStatus === 'completed' ? `Completed · ${elapsed}s` :
                                 pipelineStatus === 'error' ? 'Failed' : 'Idle'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {/* Stats block */}
                        <div style={{
                            display: 'flex', gap: 16, borderRight: `1px solid ${C.border}`,
                            paddingRight: 16, height: 28, alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Job ID</span>
                                <span style={{ fontSize: 10, color: C.amberL, fontFamily: "'DM Mono',monospace" }}>{jobId ? jobId.substring(0,8) : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Context Nodes</span>
                                <span style={{ fontSize: 10, color: C.text, fontFamily: "'DM Mono',monospace" }}>{nodes.length}</span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        {pipelineStatus === 'running' && (
                            <div style={{
                                width: 120, height: 3,
                                background: 'rgba(200,134,10,0.1)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%', background: C.amber,
                                    width: `${progress}%`,
                                    transition: 'width 0.5s',
                                }} />
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none', border: `1px solid ${C.border}`,
                                cursor: 'pointer', color: C.textMuted, padding: '6px 12px',
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.amber; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                        >
                            <X size={11} /> Close
                        </button>
                    </div>
                </div>

                {/* ── THREE-COLUMN BODY ── */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* ── LEFT: Agent List ── */}
                    <div style={{
                        width: 220, flexShrink: 0,
                        borderRight: `1px solid ${C.border}`,
                        background: C.raised,
                        overflowY: 'auto',
                    }}>
                        <div style={{
                            padding: '10px 14px',
                            borderBottom: `1px solid ${C.border}`,
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                            color: C.textMuted,
                        }}>
                            Agents ({Object.values(agents).filter(a => a.status === 'completed').length}/{AGENTS_CONFIG.length})
                        </div>
                        {AGENTS_CONFIG.map(cfg => {
                            const a = agents[cfg.id];
                            const execTime = a.startTime && a.endTime
                                ? a.endTime - a.startTime
                                : a.startTime && a.status === 'running'
                                ? Date.now() - a.startTime
                                : null;
                            return (
                                <AgentItem
                                    key={cfg.id}
                                    agentId={cfg.id}
                                    name={a.name}
                                    role={a.role}
                                    status={a.status}
                                    executionTimeMs={execTime}
                                    model={a.model}
                                    tokenUsage={a.tokenUsage}
                                    isSelected={selectedAgentId === cfg.id}
                                    onClick={() => handleAgentClick(cfg.id)}
                                />
                            );
                        })}
                    </div>

                    {/* ── CENTER: Log Stream ── */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {/* Log header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 16px',
                            borderBottom: `1px solid ${C.border}`,
                            background: C.surface,
                            flexShrink: 0,
                        }}>
                            <span style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                                color: C.textMuted,
                            }}>
                                Logs ({logs.length})
                            </span>
                            <button
                                onClick={() => setAutoScroll(v => !v)}
                                style={{
                                    background: 'none', border: `1px solid ${C.border}`,
                                    cursor: 'pointer',
                                    color: autoScroll ? C.amber : C.textMuted,
                                    padding: '4px 8px',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    fontFamily: "'DM Mono',monospace",
                                    fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {autoScroll ? <Play size={8} /> : <Pause size={8} />}
                                {autoScroll ? 'Auto-scroll' : 'Paused'}
                            </button>
                        </div>

                        {/* Log entries */}
                        <div
                            ref={logContainerRef}
                            style={{
                                flex: 1, overflowY: 'auto',
                                background: C.paper,
                                contain: 'strict',
                                contentVisibility: 'auto',
                            }}
                        >
                            {logs.length === 0 ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    height: '100%', gap: 12,
                                }}>
                                    <Terminal size={28} style={{ color: C.textMuted, opacity: 0.3 }} />
                                    <span style={{
                                        fontFamily: "'DM Mono',monospace",
                                        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                                        color: C.textMuted,
                                    }}>
                                        No logs yet — start a synthesis to see output
                                    </span>
                                </div>
                            ) : (
                                logs.map(log => <LogRow key={log.id} log={log} />)
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Agent Inspector ── */}
                    <div style={{
                        width: 340, flexShrink: 0,
                        borderLeft: `1px solid ${C.border}`,
                        background: C.raised,
                        display: 'flex', flexDirection: 'column',
                    }}>
                        {/* Inspector header */}
                        <div style={{
                            padding: '10px 14px',
                            borderBottom: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <ChevronRight size={10} style={{ color: C.amber }} />
                            <span style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                                color: C.textMuted,
                            }}>
                                {selectedAgent ? selectedAgent.name : 'Select an agent'}
                            </span>
                            {selectedAgent && (
                                <span style={{
                                    fontSize: 8, letterSpacing: '0.1em', color: C.textMuted,
                                    marginLeft: 'auto',
                                    fontFamily: "'DM Mono',monospace",
                                }}>
                                    {selectedAgent.role}
                                </span>
                            )}
                        </div>

                        {/* Tabs */}
                        {selectedAgent && (
                            <div style={{
                                display: 'flex', borderBottom: `1px solid ${C.border}`,
                                background: C.surface, flexShrink: 0,
                            }}>
                                <button
                                    className={`sm-tab${inspectorTab === 'response' ? ' active' : ''}`}
                                    onClick={() => setInspectorTab('response')}
                                >
                                    <FileText size={9} style={{ marginRight: 4 }} /> Response
                                </button>
                                <button
                                    className={`sm-tab${inspectorTab === 'prompt' ? ' active' : ''}`}
                                    onClick={() => setInspectorTab('prompt')}
                                >
                                    <Terminal size={9} style={{ marginRight: 4 }} /> Prompt
                                </button>
                                <button
                                    className={`sm-tab${inspectorTab === 'json' ? ' active' : ''}`}
                                    onClick={() => setInspectorTab('json')}
                                >
                                    <Code2 size={9} style={{ marginRight: 4 }} /> JSON
                                </button>
                            </div>
                        )}

                        {/* Inspector body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                            {!selectedAgent ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    height: '100%', gap: 10,
                                }}>
                                    <Cpu size={24} style={{ color: C.textMuted, opacity: 0.25 }} />
                                    <span style={{
                                        fontFamily: "'DM Mono',monospace",
                                        fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                                        color: C.textMuted, textAlign: 'center',
                                    }}>
                                        Click an agent to inspect
                                    </span>
                                </div>
                            ) : !selectedResponse ? (
                                <div style={{
                                    fontFamily: "'DM Mono',monospace",
                                    fontSize: 10, color: C.textMuted,
                                    letterSpacing: '0.08em',
                                }}>
                                    {selectedAgent.status === 'idle'
                                        ? 'Agent has not run yet.'
                                        : selectedAgent.status === 'running'
                                        ? 'Agent is currently executing...'
                                        : 'No response data captured.'}
                                </div>
                            ) : (
                                <div style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: 10, lineHeight: 1.7, color: C.text,
                                    letterSpacing: '0.02em',
                                    wordBreak: 'break-word',
                                }}>
                                    {inspectorTab === 'response' && (
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontFamily: "'DM Mono', monospace",
                                        }}>
                                            {selectedResponse.response || 'No response body.'}
                                        </pre>
                                    )}
                                    {inspectorTab === 'prompt' && (
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontFamily: "'DM Mono', monospace",
                                            color: C.textMid,
                                        }}>
                                            {selectedResponse.prompt || 'No prompt data captured.'}
                                        </pre>
                                    )}
                                    {inspectorTab === 'json' && (
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontFamily: "'DM Mono', monospace",
                                            color: C.amberL,
                                        }}>
                                            {selectedResponse.json
                                                ? JSON.stringify(selectedResponse.json, null, 2)
                                                : 'No structured output.'}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
