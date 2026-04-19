'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  contextNodeCount: number;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, contextNodeCount, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm">
      {/* Context indicator */}
      {contextNodeCount > 0 && (
        <div className="px-3 pt-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--amber-dim)] border border-[var(--amber)]/15 text-[10px] text-[var(--amber)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
            {contextNodeCount} node{contextNodeCount > 1 ? 's' : ''} selected
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to create nodes, expand ideas..."
          disabled={disabled || isStreaming}
          rows={1}
          className="flex-1 resize-none bg-[var(--raised)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]/30 focus:ring-1 focus:ring-[var(--amber)]/10 transition-all disabled:opacity-50 leading-relaxed"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center hover:bg-red-500/25 transition-all"
            title="Stop generating"
          >
            <Square size={14} className="text-red-400" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="shrink-0 w-9 h-9 rounded-xl bg-[var(--amber)]/15 border border-[var(--amber)]/20 flex items-center justify-center hover:bg-[var(--amber)]/25 transition-all disabled:opacity-30 disabled:hover:bg-[var(--amber)]/15"
            title="Send message"
          >
            <Send size={14} className="text-[var(--amber)]" />
          </button>
        )}
      </div>
    </div>
  );
}
