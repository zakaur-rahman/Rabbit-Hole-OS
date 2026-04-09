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
import { LogTabs } from './LogTabs';

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

/**
 * CognodeLogo Helper
 */
const CognodeLogo = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// ── Main Component ───────────────────────────────────────────────────────────

interface SynthesisMonitorPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SynthesisMonitorPanel({ isOpen, onClose }: SynthesisMonitorPanelProps) {
    const sessions = useSynthesisMonitorStore(s => s.sessions);
    const activeSessionId = useSynthesisMonitorStore(s => s.activeSessionId);
    
    // Derive active session data
    const activeSession = activeSessionId ? sessions[activeSessionId] : null;
    
    const agents = activeSession?.agents ?? {};
    const emptyLogsRef = useRef<LogEntry[]>([]);
    const logs = activeSession?.logs ?? emptyLogsRef.current;
    const agentResponses = activeSession?.agentResponses ?? {};
    const pipelineStatus = activeSession?.pipelineStatus ?? 'idle';
    const jobId = activeSession?.jobId ?? null;

    const selectedAgentId = useSynthesisMonitorStore(s => s.selectedAgentId);
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

    const [renderTime, setRenderTime] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setRenderTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!isOpen) return null;

    const selectedResponse = selectedAgentId ? agentResponses[selectedAgentId] : null;
    const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 999998,
                background: 'rgba(10,9,6,.92)',
                backdropFilter: 'blur(12px)',
                display: 'flex', flexDirection: 'column',
                color: C.text,
            }}
        >
            <style>{`
                @keyframes sm-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.35)} }
                .sm-tab { font-family:'DM Mono',monospace; font-size:9px; font-weight:400; letter-spacing:.14em; text-transform:uppercase; padding:8px 14px; cursor:pointer; background:none; border:none; border-bottom:2px solid transparent; transition:all .2s; color:rgba(240,236,224,.35); }
                .sm-tab:hover { color: #c8860a; }
                .sm-tab.active { color:#c8860a; border-bottom-color:#c8860a; background:rgba(200,134,10,.06); }
            `}</style>

            {/* ── LOG HISTORY TABS ── */}
            <LogTabs />

            {/* ── TOP BAR ── */}
            <div style={{
                height: 48, borderBottom: `1px solid ${C.border}`,
                background: 'rgba(17,16,9, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 24px', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CognodeLogo size={20} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                            fontFamily: "'DM Serif Text', serif",
                            fontSize: 16, letterSpacing: '0.04em', lineHeight: 1,
                            color: C.amber,
                        }}>
                            Cognode Synthesis Monitor
                        </span>
                        <span style={{
                            fontSize: 8, opacity: 0.5, letterSpacing: '0.15em',
                            textTransform: 'uppercase', fontFamily: "'DM Mono', monospace",
                        }}>
                            Pipeline Observability & Session History
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        display: 'flex', gap: 16, borderRight: `1px solid ${C.border}`,
                        paddingRight: 16, height: 28, alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Job ID</span>
                            <span style={{ fontSize: 10, color: C.amberL, fontFamily: "'DM Mono',monospace" }}>{jobId ? jobId.substring(0,8) : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nodes</span>
                            <span style={{ fontSize: 10, color: C.text, fontFamily: "'DM Mono',monospace" }}>{nodes.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                            <span style={{ fontSize: 10, color: C.text, fontFamily: "'DM Mono',monospace" }}>{pipelineStatus.toUpperCase()}</span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: C.textMuted, transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* ── THREE-COLUMN BODY ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* ── LEFT: Agent List ── */}
                <div style={{
                    width: 280, borderRight: `1px solid ${C.border}`,
                    display: 'flex', flexDirection: 'column', background: 'rgba(17,16,9, 0.2)',
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
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {AGENTS_CONFIG.map(cfg => {
                            const a = agents[cfg.id];
                            if (!a) return null;

                            const execTime = a.startTime && a.endTime
                                ? Number(a.endTime) - Number(a.startTime)
                                : a.startTime && a.status === 'running'
                                ? renderTime - Number(a.startTime)
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
                </div>

                {/* ── CENTER: Log Stream ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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

                    <div
                        ref={logContainerRef}
                        style={{
                            flex: 1, overflowY: 'auto',
                            background: C.paper,
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
                                    Waiting for output...
                                </span>
                            </div>
                        ) : (
                            logs.map(log => <LogRow key={log.id} log={log} />)
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Agent Inspector ── */}
                <div style={{
                    width: 380, flexShrink: 0,
                    borderLeft: `1px solid ${C.border}`,
                    background: C.raised,
                    display: 'flex', flexDirection: 'column',
                }}>
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
                    </div>

                    {selectedAgent && (
                        <>
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

                            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                                {!selectedResponse ? (
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
                                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                                                {selectedResponse.response || 'No response body.'}
                                            </pre>
                                        )}
                                        {inspectorTab === 'prompt' && (
                                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', color: C.textMid }}>
                                                {selectedResponse.prompt || 'No prompt data captured.'}
                                            </pre>
                                        )}
                                        {inspectorTab === 'json' && (
                                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', color: C.amberL }}>
                                                {selectedResponse.json
                                                    ? JSON.stringify(selectedResponse.json, null, 2)
                                                    : 'No structured output.'}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {!selectedAgent && (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 10,
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
                    )}
                </div>
            </div>
        </div>
    );
}
