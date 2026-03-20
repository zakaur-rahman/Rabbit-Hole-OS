'use client';

import React, { useEffect, useRef } from 'react';
import { X, Download, Sparkles } from 'lucide-react';

interface ResearchPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  isLoading: boolean;
  title?: string;
  onOpenAdvancedEditor?: () => void;
  error?: string | null;
  stage?: string | null;
  message?: string | null;
}

const STEPS = ['Planning', 'Writing', 'Reviewing', 'Visual Analysis', 'Compiling'];

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
      const n = Math.min(32, Math.floor(W / 40));
      for (let i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
          r: Math.random() * 1.8 + 1,
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
        p.pulse += 0.022;
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 115) {
            const a = (1 - d / 115) * 0.18;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(200,134,10,${a})`; ctx.lineWidth = .6; ctx.stroke();
            const f = ((t * .0005) + i * .11) % 1;
            ctx.beginPath(); ctx.arc(p.x + dx * f, p.y + dy * f, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,160,32,${a * 1.5})`; ctx.fill();
          }
        }
        const g = .4 + Math.sin(p.pulse) * .38;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,134,10,${g * .6})`; ctx.fill();
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

export default function ResearchPdfModal({
  isOpen,
  onClose,
  pdfUrl,
  isLoading,
  title,
  onOpenAdvancedEditor,
  error,
  stage,
  message,
}: ResearchPdfModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStepIdx = STEPS.indexOf(stage ?? '');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      <div
        className="w-[90vw] h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
        style={{
          background: '#0f0d0a',
          border: '1px solid rgba(200,134,10,0.22)',
          borderRadius: 0,
        }}
      >
        {/* corner brackets */}
        {[
          'top-0 left-0 border-t-[1.5px] border-l-[1.5px]',
          'top-0 right-0 border-t-[1.5px] border-r-[1.5px]',
          'bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]',
          'bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]',
        ].map((cls, i) => (
          <span
            key={i}
            className={`absolute w-3 h-3 pointer-events-none ${cls}`}
            style={{ borderColor: 'rgba(200,134,10,0.55)' }}
          />
        ))}

        {/* ── TOP BAR ── */}
        <div
          className="flex items-center justify-between px-5 py-3 z-10 shrink-0"
          style={{
            background: '#0a0906',
            borderBottom: '1px solid rgba(200,134,10,0.15)',
          }}
        >
          {/* left: icon + titles */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(200,134,10,0.1)',
                border: '1px solid rgba(200,134,10,0.35)',
              }}
            >
              {/* cognode graph icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#c8860a" />
                <circle cx="4"  cy="6"  r="2" fill="rgba(200,134,10,0.5)" />
                <circle cx="20" cy="6"  r="2" fill="rgba(200,134,10,0.5)" />
                <circle cx="4"  cy="18" r="2" fill="rgba(200,134,10,0.5)" />
                <circle cx="20" cy="18" r="2" fill="rgba(200,134,10,0.5)" />
                <line x1="6"  y1="7"  x2="10" y2="11" stroke="rgba(200,134,10,0.4)" strokeWidth="1.2" />
                <line x1="18" y1="7"  x2="14" y2="11" stroke="rgba(200,134,10,0.4)" strokeWidth="1.2" />
                <line x1="6"  y1="17" x2="10" y2="13" stroke="rgba(200,134,10,0.4)" strokeWidth="1.2" />
                <line x1="18" y1="17" x2="14" y2="13" stroke="rgba(200,134,10,0.4)" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <h2
                className="text-[15px] font-bold tracking-tight leading-none mb-0.5"
                style={{ fontFamily: "'Playfair Display', serif", color: '#f0ece0' }}
              >
                Research Synthesis
              </h2>
              <p
                className="text-[10px] font-light uppercase tracking-[0.12em]"
                style={{ color: 'rgba(200,134,10,0.5)' }}
              >
                {title ?? 'Generating comprehensive report...'}
              </p>
            </div>
          </div>

          {/* right: action buttons + close */}
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                {onOpenAdvancedEditor && (
                  <button
                    onClick={onOpenAdvancedEditor}
                    className="flex items-center gap-2 text-[11px] font-light uppercase tracking-widest px-4 py-2 transition-all duration-200"
                    style={{
                      background: 'rgba(200,134,10,0.12)',
                      border: '1px solid rgba(200,134,10,0.35)',
                      color: '#c8860a',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,134,10,0.2)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,134,10,0.6)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,134,10,0.12)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,134,10,0.35)';
                    }}
                  >
                    <Sparkles size={13} />
                    Open in Editor
                  </button>
                )}
                <a
                  href={pdfUrl}
                  download="Research_Report.pdf"
                  className="flex items-center gap-2 text-[11px] font-light uppercase tracking-widest px-4 py-2 transition-all duration-200"
                  style={{
                    background: 'rgba(240,236,224,0.05)',
                    border: '1px solid rgba(240,236,224,0.12)',
                    color: 'rgba(240,236,224,0.6)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(240,236,224,0.1)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,236,224,0.9)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(240,236,224,0.05)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,236,224,0.6)';
                  }}
                >
                  <Download size={13} />
                  Download PDF
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center transition-all duration-200"
              style={{
                border: '1px solid rgba(200,134,10,0.2)',
                color: 'rgba(240,236,224,0.35)',
                background: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,134,10,0.5)';
                (e.currentTarget as HTMLButtonElement).style.color = '#c8860a';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,134,10,0.2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,236,224,0.35)';
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* global progress bar */}
        <div
          className="h-[2px] shrink-0 relative overflow-hidden"
          style={{ background: 'rgba(200,134,10,0.1)' }}
        >
          {isLoading && (
            <>
              <div
                className="absolute top-0 left-0 h-full transition-all duration-300"
                style={{
                  background: '#c8860a',
                  width: currentStepIdx >= 0
                    ? `${((currentStepIdx + 0.5) / STEPS.length) * 100}%`
                    : '8%',
                }}
              />
              <div
                className="absolute top-0 h-full w-[30%]"
                style={{
                  background: 'rgba(255,210,100,0.4)',
                  animation: 'gbar-sweep 2.2s cubic-bezier(0.4,0,0.6,1) infinite',
                  left: '-30%',
                }}
              />
            </>
          )}
          {pdfUrl && (
            <div className="absolute inset-0" style={{ background: '#c8860a' }} />
          )}
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#0a0906' }}>

          {/* ── LOADING STATE ── */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
              {/* background canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              <NodeCanvas canvasRef={canvasRef} />

              {/* scan line */}
              <div
                className="absolute left-0 right-0 h-px pointer-events-none z-2"
                style={{
                  background: 'rgba(200,134,10,0.06)',
                  animation: 'rs-scan 6s linear infinite',
                }}
              />

              {/* spinner visual */}
              <div className="relative w-[110px] h-[110px] flex items-center justify-center mb-8 z-3">
                {/* rings */}
                <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(200,134,10,0.1)', animation: 'rspin 12s linear infinite' }} />
                <div className="absolute rounded-full" style={{ inset: 9, border: '1px solid transparent', borderTopColor: 'rgba(200,134,10,0.6)', borderRightColor: 'rgba(200,134,10,0.18)', animation: 'rspin 2.6s cubic-bezier(0.5,0,0.5,1) infinite' }} />
                <div className="absolute rounded-full" style={{ inset: 20, border: '1px solid rgba(200,134,10,0.06)', animation: 'rspin 18s linear infinite reverse' }} />
                <div className="absolute rounded-full" style={{ inset: 30, border: '1px solid transparent', borderTopColor: 'rgba(232,160,32,0.7)', animation: 'rspin 1.7s linear infinite reverse' }} />
                {/* orbit dots */}
                <div className="absolute inset-0 rounded-full" style={{ animation: 'rspin 4s linear infinite' }}>
                  <div className="absolute top-[-2.5px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full" style={{ background: '#c8860a', animation: 'cpulse 2s ease-in-out infinite' }} />
                </div>
                <div className="absolute inset-0 rounded-full" style={{ animation: 'rspin 6s linear infinite reverse' }}>
                  <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full" style={{ background: 'rgba(200,134,10,0.55)', animation: 'cpulse 2s ease-in-out infinite 0.7s' }} />
                </div>
                {/* center */}
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center relative z-1"
                  style={{ background: 'rgba(200,134,10,0.1)', border: '1.5px solid rgba(200,134,10,0.45)' }}
                >
                  <div className="absolute inset-[-4px] rounded-full" style={{ border: '1px solid rgba(200,134,10,0.2)', animation: 'cpulse 2s ease-in-out infinite' }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L14.5 9H21L15.5 13L17.5 19L12 15L6.5 19L8.5 13L3 9H9.5L12 3Z" stroke="#c8860a" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(200,134,10,0.15)" />
                  </svg>
                </div>
              </div>

              {/* title + subtitle */}
              <h3
                className="text-[22px] font-bold text-center mb-2 z-3 relative"
                style={{ fontFamily: "'Playfair Display', serif", color: '#f0ece0', letterSpacing: '-0.02em' }}
              >
                Synthesizing <em style={{ fontStyle: 'italic', color: '#c8860a' }}>Research</em>
              </h3>
              <p
                className="text-center mb-8 z-3 relative leading-[1.9]"
                style={{ fontSize: 10.5, fontWeight: 300, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(200,134,10,0.5)', minHeight: 36 }}
              >
                {message ?? 'AI is analyzing collected contexts,'}
                <br />merging topics &amp; validating sources...
              </p>

              {/* step pills */}
              <div className="flex flex-col gap-[7px] w-full max-w-[400px] z-3 relative">
                {STEPS.map((s, i) => {
                  const isActive = s === stage;
                  const isDone  = currentStepIdx > i;
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-3 px-4 py-[10px] transition-all duration-500"
                      style={{
                        border: `1px solid ${isActive ? 'rgba(200,134,10,0.28)' : isDone ? 'rgba(200,134,10,0.12)' : 'rgba(200,134,10,0.08)'}`,
                        background: isActive ? 'rgba(200,134,10,0.07)' : isDone ? 'rgba(200,134,10,0.04)' : 'rgba(200,134,10,0.03)',
                        opacity: isActive ? 1 : isDone ? 0.5 : 0.28,
                      }}
                    >
                      {/* indicator */}
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-[10px]"
                        style={{
                          border: `1px solid ${isActive ? '#c8860a' : 'rgba(200,134,10,0.25)'}`,
                          background: isDone ? 'rgba(200,134,10,0.15)' : 'transparent',
                          animation: isActive ? 'cpulse 1.3s ease-in-out infinite' : 'none',
                          color: 'rgba(200,134,10,0.85)',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {isDone ? '✓' : isActive ? (
                          <span className="w-[7px] h-[7px] rounded-full block" style={{ background: '#c8860a' }} />
                        ) : null}
                      </div>
                      {/* label */}
                      <span
                        className="flex-1 text-[11px] font-light uppercase tracking-widest transition-colors duration-300"
                        style={{ color: isActive ? 'rgba(240,236,224,0.9)' : 'rgba(240,236,224,0.5)' }}
                      >
                        {s}
                      </span>
                      {/* done tag */}
                      {isDone && (
                        <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: 'rgba(200,134,10,0.55)' }}>
                          Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* footer dots */}
              <div className="flex items-center gap-2 mt-7 z-3 relative">
                {[0, 0.18, 0.36].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'rgba(200,134,10,0.3)', animation: `fdot 1.4s ease-in-out ${delay}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── PDF READY STATE ── */}
          {!isLoading && pdfUrl && (
            <iframe
              src={`${pdfUrl}#view=FitH`}
              className="w-full h-full border-none"
              title="Research PDF"
            />
          )}

          {/* ── ERROR STATE ── */}
          {!isLoading && !pdfUrl && (
            <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{ border: '1px solid rgba(220,80,60,0.35)', color: 'rgba(220,80,60,0.7)' }}
              >
                <X size={20} />
              </div>
              <p
                className="text-[11px] uppercase tracking-[0.15em] font-light"
                style={{ color: 'rgba(220,80,60,0.7)' }}
              >
                Failed to generate report
              </p>
              {error && (
                <div
                  className="max-w-xl w-full p-4 text-left"
                  style={{
                    background: 'rgba(220,80,60,0.06)',
                    border: '1px solid rgba(220,80,60,0.2)',
                  }}
                >
                  <p className="text-[11px] font-mono break-all" style={{ color: 'rgba(220,100,80,0.8)' }}>
                    {error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* keyframe injection */}
      <style>{`
        @keyframes rspin { to { transform: rotate(360deg); } }
        @keyframes cpulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.12);opacity:.15} }
        @keyframes rs-scan { from{top:0} to{top:100%} }
        @keyframes fdot { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.7);opacity:1;background:#c8860a} }
        @keyframes gbar-sweep { to { left: 130%; } }
      `}</style>
    </div>
  );
}

