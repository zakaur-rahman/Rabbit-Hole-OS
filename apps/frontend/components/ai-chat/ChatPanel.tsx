'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Sparkles, Trash2, Bot } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { useGraphStore } from '@/store/graph.store';
import { sendChatMessage } from '@/lib/ai-chat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ActionPreview from './ActionPreview';
import type { ChatMessage as ChatMessageType, ChatStreamEvent } from '@/types/chat';

export default function ChatPanel() {
  const {
    isOpen,
    closePanel,
    messages,
    isStreaming,
    setStreaming,
    addMessage,
    updateLastMessage,
    pendingAction,
    setPendingAction,
    clearMessages,
    contextNodeIds,
  } = useChatStore();

  const { activeWhiteboardId, selectedNodeIds, addNode, addEdge, removeNode, fetchNodes } = useGraphStore();

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
  const executeToolCall = useCallback(async (toolCall: any) => {
    try {
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
          break;
        }
        case 'deleteNode': {
          await removeNode(toolCall.args.id as string);
          break;
        }
        default:
          break;
      }
      // Refresh graph state
      fetchNodes();
    } catch (e) {
      console.error('[ChatPanel] Tool execution error:', e);
    }
  }, [activeWhiteboardId, addNode, addEdge, removeNode, fetchNodes]);

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
    const assistantMsg: ChatMessageType = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(activeWhiteboardId, assistantMsg);
    setStreaming(true);

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
        },
        (event: ChatStreamEvent) => {
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
              break;

            case 'tool_call':
              if (event.tool_call) {
                updateLastMessage(activeWhiteboardId, (msg) => ({
                  ...msg,
                  toolCalls: [...(msg.toolCalls || []), event.tool_call!],
                }));
                // Auto-execute non-destructive actions
                if (event.tool_call.tool !== 'deleteNode') {
                  executeToolCall(event.tool_call);
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

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      pendingAction.toolCalls.forEach(tc => executeToolCall(tc));
      setPendingAction(null);
    }
  };

  const handleRejectAction = () => {
    setPendingAction(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-30 flex flex-col"
      style={{
        width: '380px',
        background: 'rgba(17, 16, 14, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 h-[44px] flex items-center justify-between px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center">
            <Sparkles size={13} className="text-[var(--amber)]" />
          </div>
          <span className="text-[12px] font-semibold tracking-wide text-[var(--text)]">Cognode AI</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green-border)] font-medium">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clearMessages(activeWhiteboardId)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--sub)] hover:text-[var(--text)] transition-all"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--sub)] hover:text-[var(--text)] transition-all"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--amber)]/8 border border-[var(--amber)]/15 flex items-center justify-center mb-4">
              <Bot size={24} className="text-[var(--amber)]/60" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1.5">Cognode AI</h3>
            <p className="text-[11px] text-[var(--sub)] leading-relaxed max-w-[260px]">
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
                  className="w-full text-left px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--text-mid)] hover:border-[var(--amber)]/30 hover:text-[var(--text)] transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          currentMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}

        {/* Action Preview */}
        {pendingAction && (
          <ActionPreview
            preview={pendingAction}
            onConfirm={handleConfirmAction}
            onReject={handleRejectAction}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        contextNodeCount={contextNodeIds.length}
      />
    </div>
  );
}
