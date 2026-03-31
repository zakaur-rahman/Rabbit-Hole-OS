'use client';

/**
 * Synthesis Monitor Store — Central state for the AI synthesis pipeline.
 *
 * Tracks agent statuses, streaming logs, agent responses/prompts,
 * pipeline progress, and notification visibility.
 */
import { create } from 'zustand';
import type { DocumentAST } from './ast.store';

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'running' | 'completed' | 'warning' | 'error';

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  startTime: number | null;
  endTime: number | null;
  model: string | null;
  tokenUsage: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  output_ast?: unknown;
  data?: {
    prompt?: string;
    response?: string;
    json?: unknown;
  };
  logType: 'step' | 'info' | 'ok' | 'warn' | 'error';
  message: string;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  agentRole: string;
  prompt: string;
  response: string;
  json: unknown;
}

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'error';

// ── Agent Definitions ────────────────────────────────────────────────────────

export const AGENTS_CONFIG: Omit<AgentInfo, 'status' | 'startTime' | 'endTime' | 'model' | 'tokenUsage'>[] = [
  { id: 'Planning',         name: 'Planner',      role: 'AI Research Architect' },
  { id: 'Writing',          name: 'Writer',        role: 'Research Synthesis Writer' },
  { id: 'Reviewing',        name: 'Reviewer',      role: 'Academic Validation Agent' },
  { id: 'Visual Analysis',  name: 'Chart Agent',   role: 'Visual Reasoning Agent' },
  { id: 'Bibliography',     name: 'Bib Normalizer', role: 'Citation & Reference Engine' },
  { id: 'Compiling',        name: 'Compilation',   role: 'LaTeX Compile Engine' },
  { id: 'Memory Update',    name: 'Memory',        role: 'Cross-Document Learning' },
];

function buildInitialAgents(): Record<string, AgentInfo> {
  const agents: Record<string, AgentInfo> = {};
  for (const cfg of AGENTS_CONFIG) {
    agents[cfg.id] = {
      ...cfg,
      status: 'idle',
      startTime: null,
      endTime: null,
      model: null,
      tokenUsage: 0,
    };
  }
  return agents;
}

function getTs(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

// ── Store Interface ──────────────────────────────────────────────────────────

interface SynthesisMonitorStore {
  // Pipeline
  pipelineStatus: PipelineStatus;
  progress: number;         // 0-100
  elapsedMs: number;
  startTimestamp: number | null;
  pipelineError: string | null;
  jobId: string | null;

  // Agents
  agents: Record<string, AgentInfo>;
  activeAgentId: string | null;
  selectedAgentId: string | null;

  // Logs
  logs: LogEntry[];

  // Agent Responses
  agentResponses: Record<string, AgentResponse>;

  // UI
  showNotification: boolean;
  showMonitorPanel: boolean;
  completedAST: DocumentAST | null;

  // Actions
  startPipeline: () => void;
  pushLog: (agent: string, logType: LogEntry['logType'], message: string) => void;
  setAgentStatus: (agentId: string, status: AgentStatus, meta?: { model?: string; tokens?: number }) => void;
  setAgentResponse: (agentId: string, data: Omit<AgentResponse, 'agentId' | 'agentName' | 'agentRole'>) => void;
  completePipeline: (ast: DocumentAST) => void;
  failPipeline: (error: string) => void;
  setProgress: (pct: number) => void;
  setJobId: (id: string) => void;
  setElapsedMs: (ms: number) => void;

  // UI actions
  selectAgent: (id: string | null) => void;
  setShowNotification: (v: boolean) => void;
  setShowMonitorPanel: (v: boolean) => void;
  dismissNotification: () => void;
  reset: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useSynthesisMonitorStore = create<SynthesisMonitorStore>((set, _get) => ({
  // Initial state
  pipelineStatus: 'idle',
  progress: 0,
  elapsedMs: 0,
  startTimestamp: null,
  pipelineError: null,
  jobId: null,

  agents: buildInitialAgents(),
  activeAgentId: null,
  selectedAgentId: null,

  logs: [],
  agentResponses: {},

  showNotification: false,
  showMonitorPanel: false,
  completedAST: null,

  // ── Actions ──────────────────────────────────────────────────────────────

  startPipeline: () => set({
    pipelineStatus: 'running',
    progress: 0,
    elapsedMs: 0,
    startTimestamp: Date.now(),
    pipelineError: null,
    jobId: null,
    agents: buildInitialAgents(),
    activeAgentId: null,
    selectedAgentId: null,
    logs: [],
    agentResponses: {},
    showNotification: true,
    completedAST: null,
  }),

  pushLog: (agent, logType, message) => set(state => ({
    logs: [...state.logs, {
      id: `log-${state.logs.length}-${Date.now()}`,
      timestamp: getTs(),
      agent,
      logType,
      message,
    }],
  })),

  setAgentStatus: (agentId, status, meta) => set(state => {
    const agent = state.agents[agentId];
    if (!agent) return state;

    const now = Date.now();
    const updated: AgentInfo = {
      ...agent,
      status,
      ...(status === 'running' && !agent.startTime ? { startTime: now } : {}),
      ...(status === 'completed' || status === 'error' || status === 'warning' ? { endTime: now } : {}),
      ...(meta?.model ? { model: meta.model } : {}),
      ...(meta?.tokens ? { tokenUsage: agent.tokenUsage + meta.tokens } : {}),
    };

    return {
      agents: { ...state.agents, [agentId]: updated },
      activeAgentId: status === 'running' ? agentId : state.activeAgentId,
    };
  }),

  setAgentResponse: (agentId, data) => set(state => {
    const agent = state.agents[agentId];
    const existing = state.agentResponses[agentId] || {
      agentId,
      agentName: agent?.name ?? agentId,
      agentRole: agent?.role ?? '',
      prompt: '',
      response: '',
      json: null,
    };

    return {
      agentResponses: {
        ...state.agentResponses,
        [agentId]: {
          ...existing,
          ...data,
        },
      },
    };
  }),

  completePipeline: (ast) => set({
    pipelineStatus: 'completed',
    progress: 100,
    completedAST: ast,
    activeAgentId: null,
  }),

  failPipeline: (error) => set({
    pipelineStatus: 'error',
    pipelineError: error,
    activeAgentId: null,
  }),

  setProgress: (pct) => set({ progress: Math.min(100, Math.max(0, pct)) }),
  setJobId: (id) => set({ jobId: id }),
  setElapsedMs: (ms) => set({ elapsedMs: ms }),

  selectAgent: (id) => set({ selectedAgentId: id }),
  setShowNotification: (v) => set({ showNotification: v }),
  setShowMonitorPanel: (v) => set({ showMonitorPanel: v }),
  dismissNotification: () => set({ showNotification: false }),

  reset: () => set({
    pipelineStatus: 'idle',
    progress: 0,
    elapsedMs: 0,
    startTimestamp: null,
    pipelineError: null,
    jobId: null,
    agents: buildInitialAgents(),
    activeAgentId: null,
    selectedAgentId: null,
    logs: [],
    agentResponses: {},
    showNotification: false,
    showMonitorPanel: false,
    completedAST: null,
  }),
}));
