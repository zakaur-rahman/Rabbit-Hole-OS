'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { synthesisApi } from '@/lib/api';
import { Node } from 'reactflow';
import { Sparkles, Loader2, Target, Link2, Search, Share2, AlertTriangle, RotateCcw, X, Copy, Check, FileDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './synthesis-theme.css';

interface SynthesisModalProps {
    onClose: () => void;
}

const STEPS = [
    { id: 'ingesting', label: 'Ingesting knowledge sources', icon: <Search size={11} /> },
    { id: 'linking', label: 'Mapping semantic relations', icon: <Link2 size={11} /> },
    { id: 'synthesizing', label: 'Synthesizing core findings', icon: <Sparkles size={11} /> },
    { id: 'publishing', label: 'Compiling final report', icon: <Share2 size={11} /> },
];

function NodeCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let W = 0, H = 0;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; pulse: number }[] = [];

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      W = canvas.width = parent.offsetWidth;
      H = canvas.height = parent.offsetHeight;
      pts.length = 0;
      const n = Math.min(28, Math.floor(W / 44));
      for (let i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
          r: Math.random() * 1.6 + 1,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.pulse += 0.02;
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            const a = (1 - d / 110) * 0.15;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(200,134,10,${a})`; ctx.lineWidth = .55; ctx.stroke();
            const f = ((t * .0004) + i * .1) % 1;
            ctx.beginPath(); ctx.arc(p.x + dx * f, p.y + dy * f, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,160,32,${a * 1.4})`; ctx.fill();
          }
        }
        const g = .35 + Math.sin(p.pulse) * .32;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,134,10,${g * .55})`; ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [canvasRef]);

  return null;
}

export default function SynthesisModal({ onClose }: SynthesisModalProps) {
    const { nodes, addNode, activeWhiteboardId } = useGraphStore();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [sources, setSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [synthesisError, setSynthesisError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get all selected nodes
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedCount = selectedNodes.length > 0 ? selectedNodes.length : nodes.length;

    // Simulated progress animation
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading) {
            setProgress(0);
            setActiveStepIndex(0);
            
            const animate = () => {
                setProgress(prev => {
                    if (prev >= 95) return prev;
                    const increment = Math.random() * 5;
                    const next = prev + increment;
                    
                    // Update active step based on progress
                    if (next < 25) setActiveStepIndex(0);
                    else if (next < 50) setActiveStepIndex(1);
                    else if (next < 85) setActiveStepIndex(2);
                    else setActiveStepIndex(3);
                    
                    return next;
                });
                timer = setTimeout(animate, 500 + Math.random() * 1000);
            };
            animate();
        }
        return () => clearTimeout(timer);
    }, [loading]);

    const handleSynthesize = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResult('');
        setSources([]);
        setSynthesisError(null);

        try {
            const targetNodes = selectedNodes.length > 0 ? selectedNodes : nodes;
            const contextItems = targetNodes.map(n => ({
                title: n.data?.title || 'Untitled',
                content: n.data?.content || n.data?.title || '',
                url: n.data?.url || `local://${n.id}`
            }));

            const response = await synthesisApi.generate({
                node_ids: targetNodes.map(n => n.id),
                context_items: contextItems,
                query: query.trim(),
                previous_summary: result || undefined
            });

            // Finish the progress
            setProgress(100);
            setActiveStepIndex(3);
            
            // Short delay to show 100%
            await new Promise(r => setTimeout(r, 600));

            setResult(response.summary);
            setSources(response.sources);
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Error generating synthesis. Make sure the backend is running.';
            setResult('');
            setSynthesisError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveToCanvas = async () => {
        if (!result) return;
        setSaving(true);
        try {
            const nodeId = `synthesis-${Date.now()}`;
            const newNode = {
                id: nodeId,
                type: 'synthesis',
                position: { x: 100, y: 100 },
                data: {
                    title: query || 'AI Synthesis',
                    summary: result,
                    sourceCount: sources.length,
                    whiteboard_id: activeWhiteboardId
                },
            };

            await addNode(newNode as Node);
            onClose();
        } catch (e) {
            console.error('Failed to save synthesis:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!result) return;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `synthesis-${timestamp}.md`;
        const content = `# AI Synthesis: ${query || 'Research Report'}\n---\n**Sources:** ${sources.join(', ') || 'All nodes'}\n**Date:** ${new Date().toLocaleString()}\n\n## Analysis\n${result}\n\n---\n*Generated by Rabbit Hole OS*`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const fillChip = (text: string) => {
        setQuery(text + ' across all collected sources and highlight key differentiators...');
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
                style={{ fontFamily: "'DM Mono', monospace" }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />
                <NodeCanvas canvasRef={canvasRef} />

                {/* Main Card */}
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 8 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-[480px] bg-[#111009] border border-[rgba(200,134,10,0.22)] shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* corner brackets */}
                    {[
                        'top-0 left-0 border-t-[1.5px] border-l-[1.5px]',
                        'top-0 right-0 border-t-[1.5px] border-r-[1.5px]',
                        'bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]',
                        'bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]',
                    ].map((cls, i) => (
                        <span key={i} className={`absolute w-[9px] h-[9px] pointer-events-none ${cls}`} style={{ borderColor: 'rgba(200,134,10,0.55)' }} />
                    ))}

                    {/* top accent bar */}
                    <div className="h-[2px] w-full bg-[rgba(200,134,10,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 h-full w-[40%] bg-[rgba(255,210,100,0.45)] animate-[sweep_3s_cubic-bezier(0.4,0,0.6,1)_infinite]" style={{ left: '-40%' }} />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(200,134,10,0.12)] bg-[#0a0906]">
                        <div className="flex items-center gap-3">
                            <div className="w-[34px] h-[34px] flex items-center justify-center bg-[rgba(200,134,10,0.1)] border border-[rgba(200,134,10,0.35)] shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="3" fill="#c8860a"/>
                                    <circle cx="4"  cy="6"  r="2" fill="rgba(200,134,10,0.55)"/>
                                    <circle cx="20" cy="6"  r="2" fill="rgba(200,134,10,0.55)"/>
                                    <circle cx="4"  cy="18" r="2" fill="rgba(200,134,10,0.55)"/>
                                    <circle cx="20" cy="18" r="2" fill="rgba(200,134,10,0.55)"/>
                                    <line x1="6"  y1="7"  x2="10" y2="11" stroke="rgba(200,134,10,0.45)" strokeWidth="1.2"/>
                                    <line x1="18" y1="7"  x2="14" y2="11" stroke="rgba(200,134,10,0.45)" strokeWidth="1.2"/>
                                    <line x1="6"  y1="17" x2="10" y2="13" stroke="rgba(200,134,10,0.45)" strokeWidth="1.2"/>
                                    <line x1="18" y1="17" x2="14" y2="13" stroke="rgba(200,134,10,0.45)" strokeWidth="1.2"/>
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-[15px] font-bold text-[#f0ece0] leading-none mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>AI Synthesis</h1>
                                <p className="text-[9px] font-light uppercase tracking-[0.18em] text-[rgba(200,134,10,0.5)]">Knowledge Orchestration</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-[26px] h-[26px] border border-[rgba(200,134,10,0.2)] text-[rgba(240,236,224,0.35)] hover:border-[rgba(200,134,10,0.5)] hover:text-[#c8860a] transition-colors duration-200">
                            ✕
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-7 px-6 min-h-[340px] flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="flex flex-col items-center py-4"
                                >
                                    {/* scan line */}
                                    <div className="absolute left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'rgba(200,134,10,0.06)', animation: 'rs-scan 6s linear infinite' }} />
                                    
                                    <div className="relative w-[100px] h-[100px] flex items-center justify-center mb-6">
                                        <div className="absolute inset-0 rounded-full border border-[rgba(200,134,10,0.1)] animate-[rspin_12s_linear_infinite]" />
                                        <div className="absolute inset-[8px] rounded-full border border-transparent border-t-[rgba(200,134,10,0.6)] animate-[rspin_2.6s_cubic-bezier(0.5,0,0.5,1)_infinite]" />
                                        <div className="absolute inset-[15px] rounded-full border border-[rgba(200,134,10,0.08)] animate-[rspin_18s_linear_infinite_reverse]" />
                                        <div className="absolute inset-0 rounded-full animate-[rspin_4s_linear_infinite]">
                                            <div className="absolute top-[-2px] left-1/2 -ms-px w-1 h-1 rounded-full bg-[#c8860a] animate-pulse" />
                                        </div>
                                        <Sparkles size={20} className="text-[#c8860a] animate-pulse relative z-10" />
                                    </div>
                                    
                                    <h3 className="text-[20px] font-bold text-center mb-2 text-[#f0ece0]" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        Synthesizing <em className="italic text-[#c8860a]">Research</em>
                                    </h3>
                                    
                                    <div className="w-full max-w-[280px] mt-6">
                                        <div className="flex justify-between text-[9px] uppercase tracking-[0.14em] text-[rgba(200,134,10,0.5)] mb-2">
                                            <span>Pipeline: {STEPS[activeStepIndex].label}</span>
                                            <span className="text-[#c8860a]">{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-[2px] w-full bg-[rgba(200,134,10,0.08)] relative overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-[#c8860a]"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 mt-8">
                                        {[0, 0.18, 0.36].map((delay, i) => (
                                            <div key={i} className="w-[3px] h-[3px] rounded-full bg-[rgba(200,134,10,0.3)]" style={{ animation: `fdot 1.4s ease-in-out ${delay}s infinite` }} />
                                        ))}
                                    </div>
                                </motion.div>
                            ) : synthesisError ? (
                                <motion.div key="error" className="flex flex-col items-center py-6">
                                    <div className="w-10 h-10 flex items-center justify-center border border-[rgba(220,80,60,0.3)] text-[rgba(220,80,60,0.7)] mb-5">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h2 className="text-[16px] font-bold text-[#f0ece0] text-center mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Synthesis Interrupted</h2>
                                    <p className="text-[10px] text-[rgba(220,100,80,0.7)] text-center leading-relaxed max-w-[320px] mb-8 bg-[rgba(220,80,60,0.04)] border border-[rgba(220,80,60,0.15)] p-4 font-mono">
                                        {synthesisError}
                                    </p>
                                    <button
                                        onClick={() => { setSynthesisError(null); handleSynthesize(); }}
                                        className="px-6 py-3 bg-[rgba(200,134,10,0.08)] border border-[rgba(200,134,10,0.25)] text-[#c8860a] text-[10px] uppercase tracking-[0.15em] hover:bg-[rgba(200,134,10,0.12)] transition-all"
                                    >
                                        Try Again
                                    </button>
                                </motion.div>
                            ) : synthesisError ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-[56px] h-[56px] rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h2 className="text-[22px] font-extrabold tracking-tight text-(--text) text-center mb-2.5">Synthesis Failed</h2>
                                    <p className="font-mono text-[11px] text-red-400/80 text-center leading-relaxed max-w-[400px] mb-6 tracking-wide bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                                        {synthesisError}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setSynthesisError(null); }}
                                            className="px-5 py-2.5 bg-(--raised) border border-(--border) text-(--text) font-bold rounded-xl flex items-center gap-2 hover:bg-(--surface) transition-all text-[11px] tracking-widest uppercase"
                                        >
                                            <RotateCcw size={14} className="text-(--amber)" />
                                            Try Again
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="px-5 py-2.5 bg-(--raised) border border-(--border) text-(--muted) font-bold rounded-xl flex items-center gap-2 hover:bg-(--surface) transition-all text-[11px] tracking-widest uppercase"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </motion.div>
                            ) : result ? (
                                <motion.div key="result" className="flex flex-col h-full py-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[9px] uppercase tracking-[0.15em] text-[rgba(200,134,10,0.5)]">Synthesis Complete</span>
                                        <div className="flex gap-2">
                                            <button onClick={copyToClipboard} className="w-7 h-7 flex items-center justify-center border border-[rgba(200,134,10,0.15)] text-[rgba(240,236,224,0.4)] hover:text-[#c8860a] hover:border-[rgba(200,134,10,0.4)] transition-all">
                                                {copied ? <Check size={14} className="text-[#c8860a]" /> : <Copy size={13} />}
                                            </button>
                                            <button onClick={handleDownloadMarkdown} className="w-7 h-7 flex items-center justify-center border border-[rgba(200,134,10,0.15)] text-[rgba(240,236,224,0.4)] hover:text-[#c8860a] hover:border-[rgba(200,134,10,0.4)] transition-all">
                                                <FileDown size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto bg-[rgba(200,134,10,0.03)] border border-[rgba(200,134,10,0.12)] p-5 mb-5 max-h-[180px] custom-scrollbar">
                                        <p className="text-[rgba(240,236,224,0.8)] leading-[1.8] text-[12px] whitespace-pre-wrap font-light">
                                            {result}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <button 
                                            onClick={handleSaveToCanvas}
                                            disabled={saving}
                                            className="w-full py-3.5 bg-[rgba(200,134,10,0.12)] border border-[rgba(200,134,10,0.35)] text-[#c8860a] text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-[rgba(200,134,10,0.22)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Target size={14} />}
                                            {saving ? 'COMMITTING...' : 'SAVE TO WHITEBOARD'}
                                        </button>
                                        <button onClick={() => setResult('')} className="w-full text-[9px] uppercase tracking-widest text-[rgba(240,236,224,0.3)] hover:text-[rgba(240,236,224,0.6)] flex items-center justify-center gap-2 transition-all">
                                            <RotateCcw size={10} /> Refine Directive
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="query" className="py-2">
                                    <h2 className="text-[18px] font-bold text-[#f0ece0] text-center mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        What should the AI <em className="italic text-[#c8860a]">focus</em> on<br/>in this research synthesis?
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] uppercase tracking-[0.18em] text-[rgba(200,134,10,0.5)] mb-2 block">Synthesis directive</label>
                                            <div className="relative">
                                                <textarea 
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                    maxLength={400}
                                                    placeholder="e.g. Compare the methodologies and find key differentiators in the findings..."
                                                    className="w-full min-h-[110px] bg-[rgba(200,134,10,0.04)] border border-[rgba(200,134,10,0.18)] text-[rgba(240,236,224,0.85)] p-4 text-[12px] font-light leading-[1.75] tracking-wide focus:outline-none focus:border-[rgba(200,134,10,0.42)] focus:bg-[rgba(200,134,10,0.07)] transition-all resize-none placeholder:text-[rgba(200,134,10,0.3)] font-mono"
                                                    autoFocus
                                                />
                                                <span className={`absolute bottom-3 right-4 text-[8px] tracking-widest transition-colors ${query.length > 350 ? 'text-[rgba(220,120,60,0.7)]' : 'text-[rgba(200,134,10,0.3)]'}`}>
                                                    {query.length} / 400
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {['Compare methodologies', 'Find contradictions', 'Extract key findings', 'Identify gaps'].map(chip => (
                                                <button key={chip} onClick={() => fillChip(chip)} className="text-[9.5px] font-light uppercase tracking-widest text-[rgba(200,134,10,0.55)] border border-[rgba(200,134,10,0.18)] bg-[rgba(200,134,10,0.04)] px-2.5 py-1 hover:border-[rgba(200,134,10,0.45)] hover:text-[#c8860a] transition-all">
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>

                                        <button 
                                            onClick={handleSynthesize}
                                            disabled={!query.trim()}
                                            className="group relative w-full py-3.5 bg-[rgba(200,134,10,0.12)] border border-[rgba(200,134,10,0.35)] text-[#c8860a] text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-[rgba(200,134,10,0.22)] hover:border-[rgba(200,134,10,0.6)] hover:text-[#e8a020] transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-[rgba(255,210,100,0.08)] to-transparent -translate-x-full group-hover:animate-[shimmer_3s_ease-in-out_infinite]" />
                                            <svg className="shrink-0 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                                <path d="M12 3L14.5 9H21L15.5 13L17.5 19L12 15L6.5 19L8.5 13L3 9H9.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(200,134,10,0.15)"/>
                                            </svg>
                                            Start Synthesis Pipeline
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer wrapper */}
                    <div className="border-t border-[rgba(200,134,10,0.1)] px-5 py-3 flex items-center gap-3 bg-[#0a0906]">
                        <div className="w-5 h-5 rounded-full bg-[rgba(200,134,10,0.08)] border border-[rgba(200,134,10,0.3)] flex items-center justify-center animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c8860a]" />
                        </div>
                        <p className="text-[10px] font-light tracking-[0.08em] text-[rgba(200,134,10,0.5)] leading-relaxed">
                            Orchestrating <strong className="font-normal text-[rgba(200,134,10,0.75)]">{selectedCount}</strong> connected sources into a unified abstract syntax tree.
                        </p>
                    </div>
                </motion.div>

                {/* Internal Styles Injection */}
                <style jsx global>{`
                    @keyframes sweep { to { left: 140%; } }
                    @keyframes shimmer { to { transform: translateX(200%); } }
                    @keyframes rspin { to { transform: rotate(360deg); } }
                    @keyframes rs-scan { from { top: 0; } to { top: 100%; } }
                    @keyframes fdot { 
                        0%, 80%, 100% { transform: scale(1); opacity: .3; } 
                        40% { transform: scale(1.7); opacity: 1; background: #c8860a; } 
                    }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(200,134,10,0.05); }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(200,134,10,0.2); }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(200,134,10,0.3); }
                `}</style>
            </motion.div>
        </AnimatePresence>
    );
}
