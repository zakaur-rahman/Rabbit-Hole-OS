"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./SynthesisPipeline.module.css";
import clsx from "clsx";
import { synthesisApi, SynthesisContextItem, SynthesisAST } from "@/lib/api";
import { useGraphStore } from "@/store/graph.store";

// ── TYPES ──
type AgentStatus = "idle" | "active" | "done" | "warn" | "error";

interface Agent {
  id: string;
  name: string;
  tag: string;
  result: string;
}

interface LogEntry {
  level: "step" | "info" | "ok" | "warn" | "error";
  msg: string;
  agentId?: string;
  ts: string;
}

interface Issue {
  type: "warn" | "error";
  msg: string;
}

const AGENTS_CONFIG: Agent[] = [
  { id: "Planning", name: "Planner", tag: "AI Research Architect", result: "PLAN FINALIZED" },
  { id: "Writing", name: "Writer", tag: "Research Synthesis Writer", result: "AST SYNTHESIZED" },
  { id: "Reviewing", name: "Reviewer", tag: "Academic Validation Agent", result: "VALIDATED" },
  { id: "Visual Analysis", name: "Chart Agent", tag: "Visual Reasoning Agent", result: "FIGURES EXTRACTED" },
  { id: "Bibliography", name: "Bib Normalizer", tag: "Citation & Reference Engine", result: "REFS NORMALIZED" },
  { id: "Compiling", name: "Compilation", tag: "LaTeX Compile Engine", result: "PDF COMPILED" },
  { id: "Memory Update", name: "Memory", tag: "Cross-Document Learning", result: "KNOWLEDGE SAVED" }
];

const getTs = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

export function SynthesisPipeline() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store
  const { nodes, edges, activeWhiteboardId, setSynthesisAst } = useGraphStore();

  // ── STATE ──
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState("");
  const [query, setQuery] = useState("Summarize the autonomous agents literature.");
  const [elapsed, setElapsed] = useState(0);
  const [totalLLM, setTotalLLM] = useState(0); // Mocked for now since backend doesn't stream token counts yet
  const [totalTokens, setTotalTokens] = useState(0);
  const [globalPct, setGlobalPct] = useState(0);
  const [agentsDone, setAgentsDone] = useState(0);
  const [finalAst, setFinalAst] = useState<SynthesisAST | null>(null);
  
  const [agentStates, setAgentStates] = useState<Record<string, AgentStatus>>({});
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Particle Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width;
    let H = canvas.height;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; pulse: number }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const r = parent.getBoundingClientRect();
        W = canvas.width = r.width;
        H = canvas.height = r.height;
        pts.length = 0;
        const n = Math.min(28, Math.floor(W / 48));
        for (let i = 0; i < n; i++) {
          pts.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            r: Math.random() * 1.6 + 1,
            pulse: Math.random() * Math.PI * 2
          });
        }
      }
    };

    let animationId: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.pulse += 0.018;
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            const a = (1 - d / 110) * 0.13;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(200,134,10,${a})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        const g = 0.3 + Math.sin(p.pulse) * 0.28;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,134,10,${g * 0.55})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const pushLog = (level: LogEntry["level"], msg: string, agentId?: string) => {
    setLogs(prev => [...prev, { ts: getTs(), level, msg, agentId }]);
  };

  const pushIssue = (type: Issue["type"], msg: string) => {
    setIssues(prev => [...prev, { type, msg }]);
  };

  const startPipeline = async () => {
    if (running || nodes.length === 0) {
      if (nodes.length === 0) pushIssue('warn', 'No nodes in the workspace to synthesize.');
      return;
    }
    
    setRunning(true);
    setLogs([]);
    setIssues([]);
    setTotalLLM(0);
    setTotalTokens(0);
    setElapsed(0);
    setGlobalPct(0);
    setAgentsDone(0);
    setAgentStates({});
    setFinalAst(null);

    const startTime = Date.now();
    const intervalId = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 100);

    pushLog('info', `Compiling ${nodes.length} nodes for context...`);

    const contextItems: SynthesisContextItem[] = nodes.map(n => ({
      node_id: n.id,
      title: n.data.title || 'Untitled',
      content: n.data.content || n.data.title || '',
      url: n.data.url || `local://${n.id}`,
      node_type: n.type,
      selected_topics: [],
      outline: n.data.outline || []
    }));

    try {
      pushLog('info', `Connecting to orchestrator SSE...`);
      pushLog('step', `Job enqueued for query: "<i>${query}</i>"`);

      let currentStage = "";
      let agentsCompleted = 0;

      await synthesisApi.streamResearchAST(
        query,
        contextItems,
        edges,
        (step) => {
          // SSE Callback
          if (step.job_id && !jobId) setJobId(step.job_id);

          const backendStage = step.stage || "Unknown";
          const status = step.status; // IN_PROGRESS, COMPLETED, FAILED

          // Progress
          if (step.progress) setGlobalPct(step.progress);

          // Agent state logic
          if (backendStage && backendStage !== "DONE" && backendStage !== "ERROR") {
             if (currentStage !== backendStage) {
                 // Mark previous as done
                 if (currentStage) {
                     setAgentStates(prev => ({ ...prev, [currentStage]: "done" }));
                     agentsCompleted++;
                     setAgentsDone(agentsCompleted);
                 }
                 currentStage = backendStage;
                 setAgentStates(prev => ({ ...prev, [backendStage]: "active" }));
                 pushLog('step', `Starting step <span class="${styles.hl}">${backendStage}</span>`, backendStage);
             }
          }

          if (step.message) {
             const level = status === 'FAILED' ? 'error' : 'info';
             pushLog(level, step.message, backendStage);
             if (level === 'error') pushIssue('error', step.message);
          }

          if (status === 'COMPLETED' || backendStage === 'DONE') {
             if (currentStage) setAgentStates(prev => ({ ...prev, [currentStage]: "done" }));
             setGlobalPct(100);
             setAgentsDone(AGENTS_CONFIG.length);
             const ast = step.output_ast || step.document;
             if (ast) {
                setFinalAst(ast);
                setSynthesisAst(ast);
             }
             pushLog('ok', `<span class="${styles['hl-g']}">Pipeline finished successfully.</span>`);
             clearInterval(intervalId);
             setRunning(false);
          } else if (status === 'FAILED' || backendStage === 'ERROR') {
             pushLog('error', `<span class="${styles['hl-r']}">Pipeline failed.</span>`);
             if (currentStage) setAgentStates(prev => ({ ...prev, [currentStage]: "error" }));
             clearInterval(intervalId);
             setRunning(false);
          }
        },
        activeWhiteboardId
      );
      
    } catch (err: unknown) {
      clearInterval(intervalId);
      setRunning(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      pushLog('error', `Stream failed: ${errMsg}`);
      pushIssue('error', errMsg);
    }
  };

  const hasCritical = issues.some(i => i.type === 'error');
  const pillStatusClass = running ? styles.running : hasCritical ? styles.error : (globalPct === 100 ? styles.done : '');
  const statusText = running ? "Running" : hasCritical ? "Failed" : (globalPct === 100 ? "Completed" : "Idle");

  return (
    <div className={styles.scene}>
      <canvas ref={canvasRef} className={styles.pipeCanvas} />
      <div className={styles.grid} />
      <div className={styles.vignette} />

      {/* TOP BAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarSweep} />
        <div className={styles.topbarLeft}>
          <button 
            onClick={() => router.push('/')}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', height: '28px', padding: '0 12px',
              borderRadius: '4px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', marginRight: '16px',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)', fontSize: '11px',
              fontWeight: 600, zIndex: 10
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--amber)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            title="Return to Workspace Canvas"
          >
            ← Back
          </button>
          <div className={styles.appIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="#c8860a"/>
              <circle cx="4" cy="6" r="2" fill="rgba(200,134,10,.5)"/>
              <circle cx="20" cy="6" r="2" fill="rgba(200,134,10,.5)"/>
              <circle cx="4" cy="18" r="2" fill="rgba(200,134,10,.5)"/>
              <circle cx="20" cy="18" r="2" fill="rgba(200,134,10,.5)"/>
              <line x1="6" y1="7" x2="10" y2="11" stroke="rgba(200,134,10,.4)" strokeWidth="1.2"/>
              <line x1="18" y1="7" x2="14" y2="11" stroke="rgba(200,134,10,.4)" strokeWidth="1.2"/>
              <line x1="6" y1="17" x2="10" y2="13" stroke="rgba(200,134,10,.4)" strokeWidth="1.2"/>
              <line x1="18" y1="17" x2="14" y2="13" stroke="rgba(200,134,10,.4)" strokeWidth="1.2"/>
            </svg>
          </div>
          <div>
            <div className={styles.topbarTitle}>Synthesis Pipeline</div>
            <div className={styles.topbarSub}>Live agent orchestration via SSE</div>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <input 
            type="text" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            disabled={running}
            placeholder="Research Query..."
            style={{ 
              background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', 
              color: 'var(--amber-l)', padding: '6px 12px', borderRadius: '4px',
              fontFamily: 'var(--font-dm-mono)', fontSize: '11px', width: '250px'
            }}
          />
          <div className={clsx(styles.statusPill, pillStatusClass)}>
            <span className={clsx(styles.pillDot, running && styles.pulsing)} />
            <span>{statusText}</span>
          </div>
          <button className={styles.replayBtn} onClick={startPipeline} disabled={running}>
            {running ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className={styles.body}>
        
        {/* PIPELINE */}
        <div className={styles.panelPipeline}>
          <div className={styles.panelLabel}>
            Pipeline
            <span style={{ color: "var(--text-muted)" }}>{agentsDone} / {AGENTS_CONFIG.length}</span>
          </div>
          <div className={styles.globalBarWrap}>
            <div className={styles.globalBarFill} style={{ width: `${globalPct}%`, background: hasCritical ? 'var(--danger)' : 'var(--amber)' }} />
          </div>
          <div className={styles.pipelineList}>
            {AGENTS_CONFIG.map((a, i) => {
              const st = agentStates[a.id] || 'idle';
              const isLit = ['done', 'warn', 'error'].includes(st);
              const icon = st === 'done' ? '✓' : st === 'error' ? '✕' : st === 'warn' ? '!' : (i + 1);
              
              const tagText = st === 'idle' ? a.tag :
                              st === 'active' ? 'running...' :
                              st === 'done' ? a.result :
                              st === 'error' ? 'failed' : a.result;
              return (
                <React.Fragment key={a.id}>
                  <div className={clsx(styles.agentRow, styles[st])}>
                    <div className={clsx(styles.agentNode, styles[st])}>{icon}</div>
                    <div className={styles.agentMeta}>
                      <div className={styles.agentName}>{a.name}</div>
                      <div className={styles.agentTag}>{tagText}</div>
                    </div>
                  </div>
                  {i < AGENTS_CONFIG.length - 1 && (
                    <div className={clsx(styles.connector, isLit && styles.lit)} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* LOG STREAM */}
        <div className={styles.panelLog}>
          <div className={styles.panelLabel} style={{ justifyContent: "space-between" }}>
            <span>Live Server Logs (SSE)</span>
            <span style={{ color: "var(--text-muted)" }}>{logs.length} entries</span>
          </div>
          <div className={styles.logScroll} ref={scrollRef}>
            {logs.map((log, idx) => {
              const badgeClass = styles[`badge-${log.level}`] || styles['badge-info'];
              return (
                <div key={idx} className={styles.logEntry}>
                  <span className={styles.logTs}>{log.ts}</span>
                  <span className={clsx(styles.logBadge, badgeClass)}>{log.level}</span>
                  <span className={styles.logMsg} dangerouslySetInnerHTML={{ __html: log.msg }} />
                </div>
              );
            })}
            {!running && logs.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: "11px", padding: "10px", fontStyle: "italic" }}>
                Waiting for pipeline to start...
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className={styles.panelStats}>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Elapsed</div>
            <div className={clsx(styles.statValue, !running && elapsed > 0 && styles.green, running && styles.amber)}>
              {elapsed.toFixed(1)}s
            </div>
            <div className={styles.statSub}>Real-time execution</div>
          </div>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Context Nodes</div>
            <div className={styles.statValue}>{nodes.length}</div>
            <div className={styles.statSub}>extracted sources</div>
          </div>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Job ID</div>
            <div className={styles.statValue} style={{ fontSize: '18px' }}>{jobId ? jobId.slice(0, 8) : '—'}</div>
            <div className={styles.statSub}>{finalAst ? 'AST Generated' : 'waiting...'}</div>
          </div>

          <div className={styles.errorsBlock}>
            <div className={styles.statLabel}>Issues</div>
            <div>
              {issues.length === 0 ? (
                <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>No issues yet</div>
              ) : (
                issues.map((i, idx) => (
                  <div key={idx} className={i.type === 'error' ? styles.errorItem : styles.warnItem}>
                    {i.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* STATUS BAR */}
      <div className={styles.statusbar}>
        <div className={styles.sbLeft}>
          <div className={styles.sbItem} style={{ color: "rgba(80,180,100,.7)" }}>
            <span className={styles.sbDot} />SSE Stream Active
          </div>
          <div className={styles.sbItem} style={{ color: "rgba(80,180,100,.7)" }}>
            <span className={styles.sbDot} />arq worker
          </div>
          <div className={styles.sbItem} style={{ color: "var(--amber-l)" }}>
            <span className={styles.sbDot} />gemini-2.5-flash-lite
          </div>
        </div>
        <div className={styles.sbRight}>
          {running ? `job ${jobId.slice(0, 12)}` : jobId ? `done in ${elapsed.toFixed(1)}s` : 'ready'}
        </div>
      </div>
    </div>
  );
}
