'use client';

/**
 * Synthesis Monitor Store — Central state for the AI synthesis pipeline.
 *
 * Tracks agent statuses, streaming logs, agent responses/prompts,
 * pipeline progress, and notification visibility.
 */import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

export interface LogSession {
  id: string;
  title: string;
  createdAt: number;
  pipelineStatus: PipelineStatus;
  progress: number;
  elapsedMs: number;
  jobId: string | null;
  agents: Record<string, AgentInfo>;
  logs: LogEntry[];
  agentResponses: Record<string, AgentResponse>;
  completedAST: DocumentAST | null;
  pipelineError: string | null;
  activeAgentId: string | null;
}

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
  // Global Registry
  sessions: Record<string, LogSession>;
  activeSessionId: string | null;

  // UI State (Global across sessions)
  showNotification: boolean;
  showMonitorPanel: boolean;
  selectedAgentId: string | null;

  // Actions
  startPipeline: () => string; // Returns new sessionId
  pushLog: (agent: string, logType: LogEntry['logType'], message: string, sessionId?: string) => void;
  setAgentStatus: (agentId: string, status: AgentStatus, meta?: { model?: string; tokens?: number }, sessionId?: string) => void;
  setAgentResponse: (agentId: string, data: Omit<AgentResponse, 'agentId' | 'agentName' | 'agentRole'>, sessionId?: string) => void;
  completePipeline: (ast: DocumentAST, sessionId?: string) => void;
  failPipeline: (error: string, sessionId?: string) => void;
  setProgress: (pct: number, sessionId?: string) => void;
  setJobId: (id: string, sessionId?: string) => void;
  setElapsedMs: (ms: number, sessionId?: string) => void;

  // Session Management
  selectSession: (id: string | null) => void;
  removeSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;

  // UI actions
  selectAgent: (id: string | null) => void;
  setShowNotification: (v: boolean) => void;
  setShowMonitorPanel: (v: boolean) => void;
  dismissNotification: () => void;
  reset: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useSynthesisMonitorStore = create<SynthesisMonitorStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,

      showNotification: false,
      showMonitorPanel: false,
      selectedAgentId: null,

      // ── Actions ──────────────────────────────────────────────────────────────

      startPipeline: () => {
        const id = `session-${Date.now()}`;
        const newSession: LogSession = {
          id,
          title: `Run ${Object.keys(get().sessions).length + 1}`,
          createdAt: Date.now(),
          pipelineStatus: 'running',
          progress: 0,
          elapsedMs: 0,
          jobId: null,
          agents: buildInitialAgents(),
          logs: [],
          agentResponses: {},
          completedAST: null,
          pipelineError: null,
          activeAgentId: null,
        };

        set(state => ({
          sessions: { ...state.sessions, [id]: newSession },
          activeSessionId: id,
          showNotification: true,
          selectedAgentId: null,
        }));

        return id;
      },

      pushLog: (agent, logType, message, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;

        const session = state.sessions[sid];
        const newLog: LogEntry = {
          id: `log-${session.logs.length}-${Date.now()}`,
          timestamp: getTs(),
          agent,
          logType,
          message,
        };

        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...session,
              logs: [...session.logs, newLog],
            },
          },
        };
      }),

      setAgentStatus: (agentId, status, meta, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;

        const session = state.sessions[sid];
        const agent = session.agents[agentId];
        if (!agent) return state;

        const now = Date.now();
        const updatedAgent: AgentInfo = {
          ...agent,
          status,
          ...(status === 'running' && !agent.startTime ? { startTime: now } : {}),
          ...(status === 'completed' || status === 'error' || status === 'warning' ? { endTime: now } : {}),
          ...(meta?.model ? { model: meta.model } : {}),
          ...(meta?.tokens ? { tokenUsage: agent.tokenUsage + meta.tokens } : {}),
        };

        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...session,
              agents: { ...session.agents, [agentId]: updatedAgent },
              activeAgentId: status === 'running' ? agentId : session.activeAgentId,
            },
          },
        };
      }),

      setAgentResponse: (agentId, data, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;

        const session = state.sessions[sid];
        const agent = session.agents[agentId];
        const existing = session.agentResponses[agentId] || {
          agentId,
          agentName: agent?.name ?? agentId,
          agentRole: agent?.role ?? '',
          prompt: '',
          response: '',
          json: null,
        };

        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...session,
              agentResponses: {
                ...session.agentResponses,
                [agentId]: { ...existing, ...data },
              },
            },
          },
        };
      }),

      completePipeline: (ast, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;

        const session = state.sessions[sid];
        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...session,
              pipelineStatus: 'completed',
              progress: 100,
              completedAST: ast,
              activeAgentId: null,
            },
          },
        };
      }),

      failPipeline: (error, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;

        const session = state.sessions[sid];
        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...session,
              pipelineStatus: 'error',
              pipelineError: error,
              activeAgentId: null,
            },
          },
        };
      }),

      setProgress: (pct, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;
        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...state.sessions[sid],
              progress: Math.min(100, Math.max(0, pct)),
            },
          },
        };
      }),

      setJobId: (id, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;
        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...state.sessions[sid],
              jobId: id,
            },
          },
        };
      }),

      setElapsedMs: (ms, sessionId) => set(state => {
        const sid = sessionId || state.activeSessionId;
        if (!sid || !state.sessions[sid]) return state;
        return {
          sessions: {
            ...state.sessions,
            [sid]: {
              ...state.sessions[sid],
              elapsedMs: ms,
            },
          },
        };
      }),

      selectSession: (id) => set({ activeSessionId: id, selectedAgentId: null }),

      removeSession: (id) => set(state => {
        const newSessions = { ...state.sessions };
        delete newSessions[id];
        let nextActive = state.activeSessionId;
        if (nextActive === id) {
          const keys = Object.keys(newSessions);
          nextActive = keys.length > 0 ? keys[keys.length - 1] : null;
        }
        return {
          sessions: newSessions,
          activeSessionId: nextActive,
        };
      }),

      renameSession: (id, title) => set(state => {
        if (!state.sessions[id]) return state;
        return {
          sessions: {
            ...state.sessions,
            [id]: { ...state.sessions[id], title },
          },
        };
      }),

      selectAgent: (id) => set({ selectedAgentId: id }),
      setShowNotification: (v) => set({ showNotification: v }),
      setShowMonitorPanel: (v) => set({ showMonitorPanel: v }),
      dismissNotification: () => set({ showNotification: false }),
      reset: () => set({
        sessions: {},
        activeSessionId: null,
        selectedAgentId: null,
        showNotification: false,
        showMonitorPanel: false,
      }),
    }),
    {
      name: 'synthesis-logs-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

