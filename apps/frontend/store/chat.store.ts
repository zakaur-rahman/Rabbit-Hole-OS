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
  /** Undo entries mapped by messageId */
  messageUndoEntries: Record<string, UndoEntry>;
  /** Undo stack per whiteboard (ordered IDs) */
  undoStack: Record<string, string[]>;
  /** Currently selected node IDs for context */
  contextNodeIds: string[];
  /** Transient input to pre-fill the chat textarea */
  initialInput: string | null;
  /** IDs of messages whose actions have been undone */
  undoneMessageIds: string[];
  /** Currently selected model ID */
  selectedModelId: string;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  addMessage: (whiteboardId: string, message: ChatMessage) => void;
  updateLastMessage: (whiteboardId: string, updater: (msg: ChatMessage) => ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  setPendingAction: (action: ActionPreview | null) => void;
  pushUndo: (whiteboardId: string, messageId: string, entry: UndoEntry) => void;
  popUndo: (whiteboardId: string) => UndoEntry | undefined;
  getUndoEntry: (messageId: string) => UndoEntry | undefined;
  setContextNodeIds: (ids: string[]) => void;
  setInitialInput: (input: string | null) => void;
  setSelectedModelId: (id: string) => void;
  clearMessages: (whiteboardId: string) => void;
  rollbackToMessage: (whiteboardId: string, messageId: string) => string[];
  getMessages: (whiteboardId: string) => ChatMessage[];
  markMessageUndone: (messageId: string) => void;
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
  messageUndoEntries: {},
  undoStack: {},
  contextNodeIds: [],
  initialInput: null,
  undoneMessageIds: [],
  selectedModelId: 'gemini-2.0-flash',

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

  pushUndo: (whiteboardId, messageId, entry) => {
    set(s => ({
      messageUndoEntries: {
        ...s.messageUndoEntries,
        [messageId]: entry,
      },
      undoStack: {
        ...s.undoStack,
        [whiteboardId]: [...(s.undoStack[whiteboardId] || []), messageId].slice(-20),
      },
    }));
  },

  popUndo: (whiteboardId) => {
    const stack = get().undoStack[whiteboardId] || [];
    if (stack.length === 0) return undefined;
    const messageId = stack[stack.length - 1];
    const entry = get().messageUndoEntries[messageId];
    
    set(s => {
      const newStack = stack.slice(0, -1);
      const newEntries = { ...s.messageUndoEntries };
      // Optional: keep entry in messageUndoEntries for late UI access? 
      // For now, let's keep it to allow "Redo" or just UI state.
      return {
        undoStack: {
          ...s.undoStack,
          [whiteboardId]: newStack,
        }
      };
    });
    return entry;
  },

  getUndoEntry: (messageId) => {
    return get().messageUndoEntries[messageId];
  },

  setContextNodeIds: (ids) => set({ contextNodeIds: ids }),
  setInitialInput: (input) => set({ initialInput: input }),
  markMessageUndone: (messageId) => set(s => ({
    undoneMessageIds: [...s.undoneMessageIds, messageId]
  })),
  setSelectedModelId: (id) => set({ selectedModelId: id }),

  clearMessages: (whiteboardId) => set(s => ({
    messages: { ...s.messages, [whiteboardId]: [] }
  })),

  getMessages: (whiteboardId) => get().messages[whiteboardId] || [],

  rollbackToMessage: (whiteboardId, messageId) => {
    let removedAssistantIds: string[] = [];
    set(s => {
      const msgs = [...(s.messages[whiteboardId] || [])];
      const index = msgs.findIndex(m => m.id === messageId);
      if (index === -1) return s;

      const removed = msgs.slice(index);
      removedAssistantIds = removed.filter(m => m.role === 'assistant').map(m => m.id);

      const updatedMsgs = msgs.slice(0, index);
      const updated = { ...s.messages, [whiteboardId]: updatedMsgs };
      persistMessages(updated);
      return { messages: updated };
    });
    return removedAssistantIds;
  },
}));
