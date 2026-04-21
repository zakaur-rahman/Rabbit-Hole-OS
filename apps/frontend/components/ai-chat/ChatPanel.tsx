'use client';

// Forcing re-compile to clear stale build cache.

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Bot, User, Trash2, X, Sparkles, Pin, RotateCcw, MoreHorizontal, Plus, Square, MessageSquare, Files, Layout, Smile, History, ArrowLeft, FileCheck, CheckCircle, Lock, LogIn } from 'lucide-react';
import '@/styles/chat-windsurf.css';
import { useChatStore } from '@/store/chat.store';
import { useGraphStore } from '@/store/graph.store';
import { useShallow } from 'zustand/shallow';
import { sendChatMessage } from '@/lib/ai-chat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ActionPreview from './ActionPreview';
import type { ChatMessage as ChatMessageType, ChatStreamEvent, ToolCall } from '@/types/chat';

export default function ChatPanel() {
  const {
    isOpen,
    closePanel,
    messages,
    isStreaming,
    contextNodeIds,
    pendingAction,
  } = useChatStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      closePanel: s.closePanel,
      messages: s.messages,
      isStreaming: s.isStreaming,
      contextNodeIds: s.contextNodeIds,
      pendingAction: s.pendingAction,
    }))
  );

  const [confirmationMode, setConfirmationMode] = React.useState<'rollback' | 'new-chat' | null>(null);
  const [rollbackTargetId, setRollbackTargetId] = React.useState<string | null>(null);

  const { 
    setStreaming,
    addMessage,
    updateLastMessage,
    setPendingAction,
    clearMessages,
    selectedModelId,
  } = useChatStore();

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // Auth State Listener
  useEffect(() => {
    const checkAuth = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      setIsAuthenticated(!!token);
    };

    checkAuth();
    window.addEventListener('auth-state-changed', checkAuth);
    return () => window.removeEventListener('auth-state-changed', checkAuth);
  }, []);

  const { activeWhiteboardId, selectedNodeIds } = useGraphStore(
    useShallow((s) => ({
      activeWhiteboardId: s.activeWhiteboardId,
      selectedNodeIds: s.selectedNodeIds,
    }))
  );

  const { addNode, addEdge, removeNode, fetchNodes, setAuthModal } = useGraphStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentMessages = useMemo(() => messages[activeWhiteboardId] || [], [messages, activeWhiteboardId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, isStreaming]);

  // Update context when selection changes
  useEffect(() => {
    useChatStore.getState().setContextNodeIds(selectedNodeIds);
  }, [selectedNodeIds]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeToolCall = useCallback(async (toolCall: any): Promise<ToolCall | null> => {
    try {
      let reverseOp: ToolCall | null = null;

      switch (toolCall.tool) {
        case 'createNode': {
          const nodeId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const newNode = {
            id: nodeId,
            type: (toolCall.args.type as string) || 'note',
            position: toolCall.args.position || {
              x: 100 + Math.random() * 400,
              y: 100 + Math.random() * 400,
            },
            data: {
              title: toolCall.args.title || 'Untitled',
              content: toolCall.args.content || '',
              whiteboard_id: activeWhiteboardId,
            },
          };
          await addNode(newNode);
          reverseOp = { id: `undo-${nodeId}`, tool: 'deleteNode', args: { id: nodeId }, status: 'pending' };
          break;
        }
        case 'linkNodes': {
          const edgeId = `ai-e-${Date.now()}`;
          await addEdge({
            id: edgeId,
            source: toolCall.args.source_id as string,
            target: toolCall.args.target_id as string,
            label: (toolCall.args.label as string) || undefined,
          });
          reverseOp = { id: `undo-${edgeId}`, tool: 'unlinkNodes', args: { id: edgeId }, status: 'pending' };
          break;
        }
        case 'deleteNode': {
          // Harder to undo without snapshotting the node first
          await removeNode(toolCall.args.id as string);
          break;
        }
        default:
          break;
      }
      // Refresh graph state
      fetchNodes();
      return reverseOp;
    } catch (e) {
      console.error('[ChatPanel] Tool execution error:', e);
      return null;
    }
  }, [activeWhiteboardId, addNode, addEdge, removeNode, fetchNodes]);

  const handleUndo = useCallback(async (messageId: string) => {
    const entry = useChatStore.getState().getUndoEntry(messageId);
    if (!entry) return;

    try {
      if (entry.reverseOps) {
        for (const op of entry.reverseOps) {
          if (op.tool === 'deleteNode') {
            await removeNode(op.args.id as string);
          } else if (op.tool === 'unlinkNodes') {
            await removeNode(op.args.id as string);
          }
        }
      }
      useChatStore.getState().markMessageUndone(messageId);
      fetchNodes();
    } catch (e) {
      console.error('[ChatPanel] Undo failed:', e);
    }
  }, [removeNode, fetchNodes]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRollback = useCallback(async (messageId: string) => {
    setRollbackTargetId(messageId);
    setConfirmationMode('rollback');
  }, []);

  const executeRollback = useCallback(async () => {
    if (!rollbackTargetId) return;

    // 1. Abort any active stream
    if (isStreaming) {
      handleStop();
    }

    // 2. Clear messages and get assistant IDs that were removed
    const removedAssistantIds = useChatStore.getState().rollbackToMessage(activeWhiteboardId, rollbackTargetId);

    // 3. Revert graph changes for each removed assistant message
    try {
      for (const msgId of removedAssistantIds) {
        const entry = useChatStore.getState().getUndoEntry(msgId);
        if (entry && entry.reverseOps) {
          for (const op of entry.reverseOps) {
            if (op.tool === 'deleteNode') {
              await removeNode(op.args.id as string);
            } else if (op.tool === 'unlinkNodes') {
              await removeNode(op.args.id as string);
            }
          }
        }
      }
      fetchNodes();
    } catch (e) {
      console.error('[ChatPanel] Rollback graph sync failed:', e);
    } finally {
      setRollbackTargetId(null);
    }
  }, [activeWhiteboardId, isStreaming, rollbackTargetId, removeNode, fetchNodes, handleStop]);

  const handleGlobalUndo = useCallback(async () => {
    const entry = useChatStore.getState().popUndo(activeWhiteboardId);
    if (entry) {
      // Find the messageId associated with this entry
      // In our store, messageId is stored in the stack
      // Our popUndo already returns the entry, but we need the ID to mark it undone
      // Let's assume entry.id is `undo-${messageId}`
      const messageId = entry.id.replace('undo-', '');
      await handleUndo(messageId);
    }
  }, [activeWhiteboardId, handleUndo]);

  // Global Keyboard Shortcuts (Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleGlobalUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleGlobalUndo]);

  const handleSend = useCallback(async (content: string) => {
    // Add user message
    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(activeWhiteboardId, userMsg);

    // Add placeholder assistant message
    const assistantMsgId = `msg-${Date.now() + 1}`;
    const assistantMsg: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(activeWhiteboardId, assistantMsg);
    setStreaming(true);

    const reverseOps: ToolCall[] = [];

    // Build conversation history (last 10 messages)
    const history = currentMessages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendChatMessage(
        {
          message: content,
          whiteboard_id: activeWhiteboardId,
          selected_node_ids: contextNodeIds,
          conversation_history: history,
          model: selectedModelId,
        },
        async (event: ChatStreamEvent) => {
          switch (event.type) {
            case 'message_delta':
              updateLastMessage(activeWhiteboardId, (msg) => ({
                ...msg,
                content: msg.content + (event.content || ''),
              }));
              break;

            case 'message_end':
              updateLastMessage(activeWhiteboardId, (msg) => ({
                ...msg,
                isStreaming: false,
              }));
              // Finalize undo entry if we had ops
              if (reverseOps.length > 0) {
                useChatStore.getState().pushUndo(activeWhiteboardId, assistantMsgId, {
                  id: `undo-${assistantMsgId}`,
                  timestamp: Date.now(),
                  description: `AI changes from: ${content.slice(0, 30)}...`,
                  reverseOps,
                  snapshot: { nodes: [], edges: [] }
                });
              }
              break;

            case 'tool_call':
              if (event.tool_call) {
                updateLastMessage(activeWhiteboardId, (msg) => ({
                  ...msg,
                  toolCalls: [...(msg.toolCalls || []), event.tool_call!],
                }));
                // Auto-execute non-destructive actions
                if (event.tool_call.tool !== 'deleteNode') {
                  const rev = await executeToolCall(event.tool_call);
                  if (rev) reverseOps.push(rev);
                }
              }
              break;

            case 'tool_result':
              if (event.tool_result) {
                updateLastMessage(activeWhiteboardId, (msg) => {
                  const toolCalls = [...(msg.toolCalls || [])];
                  const lastTc = toolCalls[toolCalls.length - 1];
                  if (lastTc) {
                    lastTc.status = event.tool_result!.success ? 'executed' : 'failed';
                    lastTc.result = event.tool_result!;
                  }
                  return { ...msg, toolCalls };
                });
              }
              break;

            case 'error':
              updateLastMessage(activeWhiteboardId, (msg) => ({
                ...msg,
                isStreaming: false,
                error: event.error || 'An error occurred',
              }));
              break;
          }
        },
        abortController.signal
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        updateLastMessage(activeWhiteboardId, (msg) => ({
          ...msg,
          isStreaming: false,
          content: msg.content + ' [stopped]',
        }));
      } else {
        updateLastMessage(activeWhiteboardId, (msg) => ({
          ...msg,
          isStreaming: false,
          error: err instanceof Error ? err.message : 'Failed to send message',
        }));
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  }, [activeWhiteboardId, contextNodeIds, currentMessages, addMessage, updateLastMessage, setStreaming, executeToolCall]);

  const handleConfirmAction = () => {
    if (pendingAction) {
      pendingAction.toolCalls.forEach(tc => executeToolCall(tc));
      setPendingAction(null);
    }
  };

  const handleRejectAction = () => {
    setPendingAction(null);
  };
  
  const handleNewChat = () => {
    if (currentMessages.length === 0) return;
    setConfirmationMode('new-chat');
  };

  const executeNewChat = () => {
    clearMessages(activeWhiteboardId);
    setConfirmationMode(null);
  };

  const handleShowHistory = () => {
    alert('Conversation history is currently tied to your Whiteboards. Switching whiteboards will show related chats.');
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-full ws-window overflow-hidden flex flex-col">
      {/* Title bar */}
      <div className="ws-title-bar">
        <span className="ws-title-text truncate">AI Knowledge Assistant</span>
        <div className="ws-title-icons">
          {isAuthenticated && (
            <>
              <span onClick={handleGlobalUndo} title="Undo last AI action (Cmd+Z)" className="hover:text-[var(--amber)]"><RotateCcw size={14} /></span>
              <span onClick={handleNewChat} title="New Chat" className="hover:text-[var(--amber)]"><Plus size={14} /></span>
              <span onClick={handleShowHistory} title="History" className="hover:text-[var(--amber)]"><History size={14} /></span>
            </>
          )}
          <span onClick={closePanel} title="Close Panel" className="hover:text-[#da373c]"><X size={14} /></span>
        </div>
      </div>


      <div className="ws-chat-area flex-1 no-scrollbar space-y-1">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--ws-bubble-user)] border border-[var(--ws-border-dim)] flex items-center justify-center mb-4">
              <Bot size={24} className="text-[var(--ws-text-sub)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--ws-text-bold)] mb-1.5">Cognode AI</h3>
            <p className="text-[11px] text-[var(--ws-text-sub)] leading-relaxed max-w-[260px]">
              Create nodes, expand ideas, connect concepts — all through natural language. Select nodes on the canvas for context.
            </p>
            <div className="mt-4 space-y-1.5 w-full max-w-[260px]">
              {[
                '"Create a startup plan with 5 key areas"',
                '"Expand marketing into subtopics"',
                '"Connect these nodes logically"',
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(example.slice(1, -1))}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[var(--ws-bubble-assist)] border border-[var(--ws-border)] text-[11px] text-[var(--ws-text-sub)] hover:border-[var(--amber)]/30 hover:text-[var(--ws-text-bold)] transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          (() => {
            const lastAssistantMsgId = [...currentMessages].reverse().find(m => m.role === 'assistant')?.id;
            return currentMessages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onUndo={handleUndo} 
                onRollback={handleRollback}
                isLast={msg.id === lastAssistantMsgId}
              />
            ));
          })()
        )}

        <div ref={messagesEndRef} />

        {/* Action Preview (Windsurf style) */}
        {pendingAction && (
          <div className="pb-4">
            <ActionPreview
              preview={pendingAction}
              onConfirm={handleConfirmAction}
              onReject={handleRejectAction}
            />
          </div>
        )}
      </div>

      {/* Auth Locked Overlay - Moved inside content area to keep Title Bar accessible */}
      {!isAuthenticated && (
        <div className="ws-locked-overlay">
          <div className="ws-lock-card">
            <div className="ws-lock-icon-container">
              <Lock size={24} strokeWidth={1.5} />
            </div>
            <h2 className="ws-lock-title">Unlock Knowledge Assistant</h2>
            <p className="ws-lock-text">
              Sign in to your Cognode account to use the AI assistant, expand research topics, and sync your knowledge across devices.
            </p>
            <button 
              onClick={() => setAuthModal(true)}
              className="ws-btn-login"
            >
              <LogIn size={18} />
              Sign In to Continue
            </button>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="ws-status-bar flex items-center justify-between px-3 py-2 border-t border-[var(--ws-border)] bg-[var(--background)]">
          <div className="flex items-center gap-2 text-[11px] text-[var(--ws-text-dim)] hover:text-[var(--ws-text-sub)] cursor-pointer transition-colors">
            <ArrowLeft size={14} />
            <FileCheck size={14} className="text-[var(--ws-text-dim)]" />
            <span>0 Files With Changes</span>
          </div>
          <div className="ws-review-btn" onClick={() => {/* Future Review Logic */}}>
            <CheckCircle size={12} className="text-[var(--amber)]" />
            Review Changes
          </div>
        </div>
      )}

      {/* Input */}
      {isAuthenticated && (
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          contextNodeCount={contextNodeIds.length}
        />
      )}

      {/* Generic Confirmation Overlay */}
      {confirmationMode && (
        <div className="ws-confirm-overlay">
          <div className="ws-confirm-card">
            <div className="ws-confirm-title">
              {confirmationMode === 'rollback' ? (
                <>
                  <RotateCcw size={16} className="text-[var(--amber)]" />
                  Rewind Thread?
                </>
              ) : (
                <>
                  <Plus size={16} className="text-[var(--amber)]" />
                  New Conversation?
                </>
              )}
            </div>
            <div className="ws-confirm-text">
              {confirmationMode === 'rollback' 
                ? 'Are you sure you want to rollback to this point? All messages and graph changes after this will be lost.'
                : 'Are you sure you want to start a new chat? Your current conversation history for this whiteboard will be cleared.'
              }
            </div>
            <div className="ws-confirm-actions">
              <button 
                onClick={() => {
                  setConfirmationMode(null);
                  setRollbackTargetId(null);
                }}
                className="ws-confirm-btn ws-btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmationMode === 'rollback') executeRollback();
                  else executeNewChat();
                }}
                className="ws-confirm-btn ws-btn-primary"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
