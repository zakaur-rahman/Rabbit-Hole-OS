/**
 * TypeScript types for the AI Chat system.
 * Covers messages, tool calls, action previews, and streaming state.
 */

// ─── Tool Definitions ──────────────────────────────────────────────────────────

export type ToolName =
  | 'createNode'
  | 'updateNode'
  | 'deleteNode'
  | 'linkNodes'
  | 'unlinkNodes'
  | 'searchNodes'
  | 'expandNode'
  | 'summarizeNode';

export interface ToolCall {
  id: string;
  tool: ToolName;
  args: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'executed' | 'rejected' | 'failed';
  result?: ToolCallResult;
}

export interface ToolCallResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  /** IDs of nodes/edges affected — used for undo */
  affectedIds?: string[];
}

// ─── Messages ───────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Tool calls made by the assistant */
  toolCalls?: ToolCall[];
  /** Whether this message is still streaming */
  isStreaming?: boolean;
  /** Error message if the request failed */
  error?: string;
}

// ─── Action Preview ─────────────────────────────────────────────────────────────

export interface ActionPreview {
  id: string;
  description: string;
  toolCalls: ToolCall[];
  status: 'pending' | 'confirmed' | 'rejected';
  /** Number of nodes to be created */
  nodesToCreate?: number;
  /** Number of edges to be created */
  edgesToCreate?: number;
  /** Number of nodes to be deleted */
  nodesToDelete?: number;
}

// ─── Undo Entry ─────────────────────────────────────────────────────────────────

export interface UndoEntry {
  id: string;
  timestamp: number;
  description: string;
  /** Reverse operations to undo this action */
  reverseOps: ToolCall[];
  /** Snapshot of affected nodes/edges before the action */
  snapshot: {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
}

// ─── Chat API ───────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  whiteboard_id: string;
  selected_node_ids: string[];
  conversation_history: Array<{
    role: MessageRole;
    content: string;
  }>;
  model?: string;
}

export interface ChatStreamEvent {
  type: 'message_start' | 'message_delta' | 'message_end' | 'tool_call' | 'tool_result' | 'error';
  /** Text chunk for message_delta events */
  content?: string;
  /** Tool call data */
  tool_call?: ToolCall;
  /** Tool result data */
  tool_result?: ToolCallResult;
  /** Error message */
  error?: string;
}

export interface ConfirmActionRequest {
  action_id: string;
  whiteboard_id: string;
  confirmed: boolean;
}

export interface UndoRequest {
  whiteboard_id: string;
  undo_entry_id: string;
}
