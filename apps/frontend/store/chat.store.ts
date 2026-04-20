import { create } from 'zustand';
import type { ChatMessage, ActionPreview, UndoEntry } from '@/types/chat';

interface ChatState {
  /** Whether the chat panel is open */
  isOpen: boolean;
  /** Messages per whiteboard */
  messages: Record<string, ChatMessage[]>;
  /** Whether AI is currently responding */
  isStreaming: boolean;
  /** Pending action preview (requires confirmation) */
  pendingAction: ActionPreview | null;
  /** Undo stack per whiteboard */
  undoStack: Record<string, UndoEntry[]>;
  /** Currently selected node IDs for context */
  contextNodeIds: string[];
  /** Transient input to pre-fill the chat textarea */
  initialInput: string | null;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  addMessage: (whiteboardId: string, message: ChatMessage) => void;
  updateLastMessage: (whiteboardId: string, updater: (msg: ChatMessage) => ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  setPendingAction: (action: ActionPreview | null) => void;
  pushUndo: (whiteboardId: string, entry: UndoEntry) => void;
  popUndo: (whiteboardId: string) => UndoEntry | undefined;
  setContextNodeIds: (ids: string[]) => void;
  setInitialInput: (input: string | null) => void;
  clearMessages: (whiteboardId: string) => void;
  getMessages: (whiteboardId: string) => ChatMessage[];
}

// Load persisted messages from localStorage
function loadPersistedMessages(): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('cognode_chat_messages');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Persist messages to localStorage (debounced)
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistMessages(messages: Record<string, ChatMessage[]>) {
  if (typeof window === 'undefined') return;
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    // Only persist last 50 messages per whiteboard to avoid localStorage bloat
    const trimmed: Record<string, ChatMessage[]> = {};
    for (const [key, msgs] of Object.entries(messages)) {
      trimmed[key] = msgs.slice(-50).map(m => ({ ...m, isStreaming: false }));
    }
    localStorage.setItem('cognode_chat_messages', JSON.stringify(trimmed));
  }, 500);
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  messages: loadPersistedMessages(),
  isStreaming: false,
  pendingAction: null,
  undoStack: {},
  contextNodeIds: [],
  initialInput: null,

  togglePanel: () => set(s => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  addMessage: (whiteboardId, message) => {
    set(s => {
      const prev = s.messages[whiteboardId] || [];
      const updated = { ...s.messages, [whiteboardId]: [...prev, message] };
      persistMessages(updated);
      return { messages: updated };
    });
  },

  updateLastMessage: (whiteboardId, updater) => {
    set(s => {
      const msgs = [...(s.messages[whiteboardId] || [])];
      if (msgs.length === 0) return s;
      msgs[msgs.length - 1] = updater(msgs[msgs.length - 1]);
      const updated = { ...s.messages, [whiteboardId]: msgs };
      persistMessages(updated);
      return { messages: updated };
    });
  },

  setStreaming: (isStreaming) => set({ isStreaming }),

  setPendingAction: (action) => set({ pendingAction: action }),

  pushUndo: (whiteboardId, entry) => {
    set(s => ({
      undoStack: {
        ...s.undoStack,
        [whiteboardId]: [...(s.undoStack[whiteboardId] || []), entry].slice(-20), // Keep last 20
      },
    }));
  },

  popUndo: (whiteboardId) => {
    const stack = get().undoStack[whiteboardId] || [];
    if (stack.length === 0) return undefined;
    const entry = stack[stack.length - 1];
    set(s => ({
      undoStack: {
        ...s.undoStack,
        [whiteboardId]: stack.slice(0, -1),
      },
    }));
    return entry;
  },

  setContextNodeIds: (ids) => set({ contextNodeIds: ids }),
  setInitialInput: (input) => set({ initialInput: input }),

  clearMessages: (whiteboardId) => {
    set(s => {
      const updated = { ...s.messages, [whiteboardId]: [] };
      persistMessages(updated);
      return { messages: updated };
    });
  },

  getMessages: (whiteboardId) => {
    return get().messages[whiteboardId] || [];
  },
}));
