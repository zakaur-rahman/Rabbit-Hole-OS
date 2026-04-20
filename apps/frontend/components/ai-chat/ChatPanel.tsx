'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Bot, User, Trash2, X, Sparkles, Pin, RotateCcw, MoreHorizontal, Plus, Square, MessageSquare, Files, Layout, Smile } from 'lucide-react';
import '@/styles/chat-windsurf.css';
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
      className="absolute top-0 right-0 bottom-0 z-30 ws-window overflow-hidden border-l border-[var(--border)]"
      style={{ width: '400px' }}
    >
      {/* Title bar */}
      <div className="ws-title-bar">
        <span className="ws-title-text truncate">Building AI-Native Knowledge Graph</span>
        <div className="ws-title-icons">
          <span><Plus size={14} /></span>
          <span><RotateCcw size={14} /></span>
          <span><MoreHorizontal size={14} /></span>
          <span onClick={closePanel}><X size={14} /></span>
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
                  className="w-full text-left px-3 py-2 rounded-lg bg-[var(--ws-bubble-user)] border border-[var(--ws-border-dim)] text-[11px] text-[var(--ws-text-sub)] hover:border-[var(--ws-blue)]/30 hover:text-[var(--ws-text-bold)] transition-all"
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

      {/* Toolbar */}
      <div className="ws-toolbar">
        <div className="ws-tool-icons">
          <span><Files size={14} /></span>
          <span><Layout size={14} /></span>
          <span><MessageSquare size={14} /></span>
          <span><Smile size={14} /></span>
        </div>
        <div className="ws-review-btn" onClick={() => {/* Future PR/Action logic */}}>
          <span className="text-[10px]">≡</span> Review Changes
        </div>
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
