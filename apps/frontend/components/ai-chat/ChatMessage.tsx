'use client';

import React from 'react';
import { Bot, User, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ToolCall } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
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

export default function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'assistant';
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[10px] text-[var(--ws-status)] bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--ws-border-dim)]">
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="ws-user-bubble group mb-2">
        {message.content}
        <button className="ws-action-btn opacity-0 group-hover:opacity-100 transition-opacity">⧉</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mb-4">
      {/* Status indicator for assistant */}
      <div className="ws-status-row">
        <span>Worked for 1s</span>
        <span className="ws-status-chevron">›</span>
      </div>

      <div className="text-[12.5px] leading-relaxed text-[var(--ws-text)] px-1">
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

      {/* Error Row (Windsurf style) */}
      {message.error && (
        <div className="ws-error-row">
          <span className="ws-err-label">Error</span>
          <span className="ws-err-msg">{message.error}</span>
          <span className="text-[11px] text-[#555] ml-auto">›</span>
        </div>
      )}
      
      {isBot && !message.isStreaming && (
        <div className="flex justify-end px-1 mt-1">
          <button className="text-[12px] text-[#4a4a4a] hover:text-[#888] transition-colors">⧉</button>
        </div>
      )}
    </div>
  );
}
