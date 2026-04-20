'use client';

import React from 'react';
import { Bot, User, AlertTriangle, Check, X, Loader2, Copy, ThumbsUp, ThumbsDown, RotateCcw, CornerUpRight, Share2, ArrowLeft } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import type { ChatMessage as ChatMessageType, ToolCall } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onUndo?: (messageId: string) => void;
  onRollback?: (messageId: string) => void;
  isLast?: boolean;
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const toolLabels: Record<string, string> = {
    createNode: 'createNode',
    updateNode: 'updateNode',
    deleteNode: 'deleteNode',
    linkNodes: 'linkNodes',
    unlinkNodes: 'unlinkNodes',
    searchNodes: 'searchNodes',
    expandNode: 'expandNode',
    summarizeNode: 'summarizeNode',
  };

  return (
    <div className="ws-running-block">
      <div className="ws-run-header">
        Running <span className="ws-run-badge">1 tool</span> <span className="text-[10px] text-[#555]">⌄</span>
      </div>
      <div className="ws-cmd-line">
        <span className="ws-cmd-prompt">…\ Rabbit-Hole-OS &gt;</span>
        <span className="ws-cmd-text">
          {toolLabels[toolCall.tool] || toolCall.tool} 
          {toolCall.args && ' ' + JSON.stringify(toolCall.args).slice(0, 50) + '...'}
        </span>
        <span className="ws-action-btn ml-auto text-[10px]">⧉</span>
      </div>
      {toolCall.result && (
        <div className="ws-result-area">
          {toolCall.result.success ? (
            <div className="text-green-500/70">Success: {JSON.stringify(toolCall.result.data).slice(0, 100)}</div>
          ) : (
            <div className="text-red-400">Error: {toolCall.result.error}</div>
          )}
        </div>
      )}
      <div className="ws-run-footer">
        <span className="text-[10px] text-[#777] flex items-center gap-1 cursor-pointer hover:text-[#aaa]">
          Ask every time ∧
        </span>
        <span className="ws-exit-code">Exit code {toolCall.result?.success ? 0 : 1}</span>
      </div>
    </div>
  );
}

export default function ChatMessage({ message, onUndo, onRollback, isLast }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<'up' | 'down' | null>(null);
  
  const undoneMessageIds = useChatStore(s => s.undoneMessageIds);
  const isUndone = undoneMessageIds.includes(message.id);

  const isBot = message.role === 'assistant';
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[10px] text-[var(--ws-status)] bg-[var(--ws-bubble-assist)] px-3 py-1 rounded-full border border-[var(--ws-border-dim)]">
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group animate-in slide-in-from-right-2 duration-200">
        <div className={`ws-user-bubble relative ${isUndone ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          {message.content}
          
          {/* User Rollback button */}
          <button 
            onClick={() => onRollback?.(message.id)}
            className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[var(--ws-bg)] border border-[var(--ws-border)] text-[var(--ws-text-dim)] hover:text-[var(--ws-amber)] hover:border-[var(--ws-amber)] opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
            title="Rollback from here"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 mb-6 group/msg transition-all duration-300 ${isUndone ? 'opacity-40 grayscale pointer-events-none' : ''}`}>

      {(message.content || message.isStreaming) && (
        <div className="ws-assist-bubble">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-[var(--ws-amber)] ml-1 animate-pulse rounded-sm align-middle" />
          )}
        </div>
      )}

      {/* Tool Calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="w-full mt-2">
          {message.toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

        <div className="ws-error-row mt-2">
          <span className="ws-err-label">Error</span>
          <span className="ws-err-msg">{message.error}</span>
        </div>
      
      {/* Bot Message Footer */}
      {isBot && !message.isStreaming && (
        <div className="flex items-center gap-3 px-1 mt-3 opacity-0 group-hover/msg:opacity-100 transition-opacity">
          {isLast && (
            <button 
              onClick={() => {
                if (onUndo) {
                  onUndo(message.id);
                }
              }}
              className="text-[var(--ws-text-dim)] hover:text-[var(--ws-text-sub)] transition-colors"
              title="Undo these changes"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button 
            onClick={handleCopy}
            className={`${copied ? 'text-[var(--ws-amber)]' : 'text-[var(--ws-text-dim)]'} hover:text-[var(--ws-text-sub)] transition-colors`}
            title="Copy response"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {isLast && (
            <div className="flex items-center gap-1.5 ml-1">
              <button 
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`${feedback === 'up' ? 'text-[var(--ws-amber)]' : 'text-[var(--ws-text-dim)]'} hover:text-[var(--ws-text-sub)] transition-colors`}
              >
                <ThumbsUp size={14} />
              </button>
              <button 
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`${feedback === 'down' ? 'text-[var(--ws-red)]' : 'text-[var(--ws-text-dim)]'} hover:text-[var(--ws-text-sub)] transition-colors`}
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
