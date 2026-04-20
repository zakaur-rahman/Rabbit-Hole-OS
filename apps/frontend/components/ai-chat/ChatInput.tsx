'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Mic, Plus } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { useGraphStore } from '@/store/graph.store';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  contextNodeCount: number;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, contextNodeCount, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const { initialInput, setInitialInput } = useChatStore();
  const { setSelectedNodeIds } = useGraphStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Sync initial input from store
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
      setInitialInput(null); // Clear after consumption
      textareaRef.current?.focus();
    }
  }, [initialInput, setInitialInput]);

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
    <div className="ws-input-container">
      {/* Search/Workflow Indicator (Placeholder style) */}
      <div className="ws-input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, @ to mention, / for workflows"
          disabled={disabled || isStreaming}
          rows={1}
          className="ws-textarea no-scrollbar"
          style={{ minHeight: '20px', maxHeight: '120px' }}
        />
      </div>

      <div className="ws-input-footer">
        <div className="ws-input-left">
          <span className="ws-plus-icon"><Plus size={16} /></span>
          <div className="ws-mode-chip flex items-center gap-1">
             <span className="text-[10px]">∧</span> Planning <span className="text-[10px]">∧</span>
          </div>
          <div className="ws-mode-chip flex items-center gap-1">
             <span className="text-[10px]">∧</span> Gemini 2.0 Flash <span className="text-[10px]">∧</span>
          </div>
          {contextNodeCount > 0 && (
            <div className="ws-mode-chip !text-[var(--amber)] !border-[var(--amber)]/20 bg-[var(--amber)]/5 flex items-center gap-1">
              {contextNodeCount} contextual node{contextNodeCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        <div className="ws-input-right">
          <span className="ws-mic-icon"><Mic size={14} /></span>
          {isStreaming ? (
            <div onClick={onStop} className="ws-stop-btn" title="Stop generating">
              <div className="ws-stop-inner"></div>
            </div>
          ) : (
            <button 
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={`p-1 rounded-lg transition-colors ${!input.trim() ? 'text-[#444]' : 'text-[var(--amber)] hover:text-[var(--amber-light)]'}`}
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
