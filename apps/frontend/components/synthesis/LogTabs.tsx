'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal } from 'lucide-react';
import { useSynthesisMonitorStore, type LogSession } from '@/store/synthesis-monitor.store';

const C = {
    amber:    '#c8860a',
    amberL:   '#e8a020',
    text:     '#f0ece0',
    textMid:  'rgba(240,236,224,.6)',
    textMuted:'rgba(240,236,224,.35)',
    border:   'rgba(200,134,10,.2)',
    surface:  '#111009',
};

export function LogTabs() {
    const sessions = useSynthesisMonitorStore(s => s.sessions);
    const activeSessionId = useSynthesisMonitorStore(s => s.activeSessionId);
    const selectSession = useSynthesisMonitorStore(s => s.selectSession);
    const removeSession = useSynthesisMonitorStore(s => s.removeSession);
    const renameSession = useSynthesisMonitorStore(s => s.renameSession);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const sessionList = Object.values(sessions).sort((a, b) => b.createdAt - a.createdAt);

    const handleStartEdit = (e: React.MouseEvent, s: LogSession) => {
        e.stopPropagation();
        setEditingId(s.id);
        setEditValue(s.title);
    };

    const handleSaveEdit = (id: string) => {
        if (editValue.trim()) {
            renameSession(id, editValue.trim());
        }
        setEditingId(null);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '0 12px',
            background: '#0a0906',
            borderBottom: `1px solid ${C.border}`,
            height: 38,
            overflowX: 'auto',
            scrollbarWidth: 'none',
        }}>
            <style>{`
                .log-tab-scroll::-webkit-scrollbar { display: none; }
                .log-tab { 
                    position: relative;
                    height: 100%;
                    display: flex;
                    alignItems: center;
                    gap: 8px;
                    padding: 0 16px;
                    cursor: pointer;
                    font-family: 'DM Mono', monospace;
                    font-size: 10px;
                    letter-spacing: 0.05em;
                    transition: all 0.2s;
                    border-right: 1px solid rgba(200,134,10,0.05);
                    white-space: nowrap;
                    color: rgba(240,236,224, 0.4);
                }
                .log-tab:hover { background: rgba(200,134,10, 0.04); color: #c8860a; }
                .log-tab.active { 
                    background: rgba(200,134,10, 0.08); 
                    color: #c8860a; 
                }
                .log-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    height: 2px;
                    background: #c8860a;
                    box-shadow: 0 0 8px #c8860a;
                }
            `}</style>

            <AnimatePresence mode="popLayout">
                {sessionList.map((s) => (
                    <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`log-tab ${activeSessionId === s.id ? 'active' : ''}`}
                        onClick={() => selectSession(s.id)}
                    >
                        <Terminal size={10} style={{ opacity: activeSessionId === s.id ? 1 : 0.5 }} />
                        
                        {editingId === s.id ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(s.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(s.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    color: C.amber,
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    width: 80,
                                }}
                            />
                        ) : (
                            <span onDoubleClick={(e) => handleStartEdit(e, s)}>{s.title}</span>
                        )}

                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span style={{ fontSize: 8, opacity: 0.3, letterSpacing: 0 }}>
                                {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {activeSessionId !== s.id && (
                                <X 
                                    size={10} 
                                    className="hover:text-red-500 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeSession(s.id);
                                    }}
                                />
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
