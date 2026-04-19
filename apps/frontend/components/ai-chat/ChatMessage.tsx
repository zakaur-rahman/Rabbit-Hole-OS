'use client';

import React from 'react';
import { Bot, User, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ToolCall } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const toolLabels: Record<string, string> = {
    createNode: '📝 Create Node',
    updateNode: '✏️ Update Node',
    deleteNode: '🗑️ Delete Node',
    linkNodes: '🔗 Link Nodes',
    unlinkNodes: '✂️ Unlink Nodes',
    searchNodes: '🔍 Search Nodes',
    expandNode: '🌱 Expand Node',
    summarizeNode: '📋 Summarize Node',
  };

  const statusColors: Record<string, string> = {
    pending: 'border-amber-500/30 bg-amber-500/5',
    confirmed: 'border-green-500/30 bg-green-500/5',
    executed: 'border-green-500/30 bg-green-500/5',
    rejected: 'border-red-500/30 bg-red-500/5',
    failed: 'border-red-500/30 bg-red-500/5',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Loader2 size={12} className="text-amber-400 animate-spin" />,
    confirmed: <Check size={12} className="text-green-400" />,
    executed: <Check size={12} className="text-green-400" />,
    rejected: <X size={12} className="text-red-400" />,
    failed: <AlertTriangle size={12} className="text-red-400" />,
  };

  return (
    <div className={`mt-2 rounded-lg border px-3 py-2 ${statusColors[toolCall.status] || ''}`}>
      <div className="flex items-center gap-2">
        {statusIcons[toolCall.status]}
        <span className="text-xs font-medium text-[var(--text-mid)]">
          {toolLabels[toolCall.tool] || toolCall.tool}
        </span>
      </div>
      {toolCall.args && Object.keys(toolCall.args).length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {Object.entries(toolCall.args).map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-1.5 text-[10px]">
              <span className="text-[var(--sub)] font-mono">{key}:</span>
              <span className="text-[var(--text-mid)] truncate max-w-[200px]">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {toolCall.result && !toolCall.result.success && (
        <div className="mt-1 text-[10px] text-red-400">
          {toolCall.result.error || 'Action failed'}
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[10px] text-[var(--sub)] bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--border)]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
        isUser
          ? 'bg-[var(--amber-dim)] border border-[var(--amber)]/20'
          : 'bg-[var(--surface)] border border-[var(--border)]'
      }`}>
        {isUser ? (
          <User size={14} className="text-[var(--amber)]" />
        ) : (
          <Bot size={14} className="text-[var(--text-mid)]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-[var(--amber)]/10 border border-[var(--amber)]/15 text-[var(--text)]'
            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-mid)]'
        }`}>
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-[var(--amber)] ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full mt-1">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Error */}
        {message.error && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-red-400">
            <AlertTriangle size={10} />
            {message.error}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[9px] text-[var(--sub)] mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
