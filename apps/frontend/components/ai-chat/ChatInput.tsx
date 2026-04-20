'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Mic, Plus, Sparkles, FileText, Layout, CheckCircle, Database, ChevronDown, Zap, Brain, Search } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { useGraphStore } from '@/store/graph.store';
import ChatSuggestionMenu, { SuggestionItem } from './ChatSuggestionMenu';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  contextNodeCount: number;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, contextNodeCount, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [suggestionMode, setSuggestionMode] = useState<'mention' | 'command' | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  
  const { 
    initialInput, 
    setInitialInput, 
    setContextNodeIds, 
    contextNodeIds, 
    selectedModelId, 
    setSelectedModelId 
  } = useChatStore();
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  
  const models = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', icon: <Zap size={13} />, desc: 'Fast & efficient' },
    { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', icon: <Brain size={13} />, desc: 'Complex reasoning' },
    { id: 'gemini-thinking', name: 'Thinking Model', icon: <Search size={13} />, desc: 'Deep research' },
  ];

  const activeModel = models.find(m => m.id === selectedModelId) || models[0];

  const { nodes, setSelectedNodeIds } = useGraphStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const COMMANDS: SuggestionItem[] = [
    { id: 'summarize', title: '/summarize', description: 'Summarize selected nodes', icon: <FileText size={14} />, type: 'command' },
    { id: 'expand', title: '/expand', description: 'Expand ideas into subtopics', icon: <Sparkles size={14} />, type: 'command' },
    { id: 'canvas', title: '/canvas', description: 'Create new nodes on the canvas', icon: <Layout size={14} />, type: 'command' },
    { id: 'review', title: '/review', description: 'Review proposed graph changes', icon: <CheckCircle size={14} />, type: 'command' },
  ];

  const filteredSuggestions = (() => {
    if (suggestionMode === 'command') {
      return COMMANDS.filter(c => c.title.toLowerCase().includes(suggestionQuery.toLowerCase()));
    }
    if (suggestionMode === 'mention') {
      return nodes
        .filter(n => n.data.title?.toLowerCase().includes(suggestionQuery.toLowerCase()))
        .slice(0, 8)
        .map(n => ({
          id: n.id,
          title: n.data.title || 'Untitled',
          description: n.type,
          type: 'mention' as const
        }));
    }
    return [];
  })();

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(initialInput);
      // Use setTimeout to avoid synchronous setState in effect body
      const timer = setTimeout(() => {
        setInitialInput(null);
      }, 0);
      textareaRef.current?.focus();
      return () => clearTimeout(timer);
    }
  }, [initialInput, setInitialInput]);

  // Handle trigger detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    const textBefore = value.slice(0, cursor);
    
    setInput(value);

    // Detect triggers
    const mentionMatch = textBefore.match(/@(\w*)$/);
    const commandMatch = textBefore.match(/\/(\w*)$/);

    if (mentionMatch) {
      setSuggestionMode('mention');
      setSuggestionQuery(mentionMatch[1]);
      setActiveIndex(0);
    } else if (commandMatch) {
      setSuggestionMode('command');
      setSuggestionQuery(commandMatch[1]);
      setActiveIndex(0);
    } else {
      setSuggestionMode(null);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    const cursor = textareaRef.current?.selectionStart || 0;
    const textBefore = input.slice(0, cursor);
    const textAfter = input.slice(cursor);
    
    const triggerRegex = suggestionMode === 'mention' ? /@\w*$/ : /\/\w*$/;
    const replacedText = textBefore.replace(triggerRegex, item.type === 'mention' ? `[[${item.title}]]` : `${item.title} `);
    
    setInput(replacedText + textAfter);
    setSuggestionMode(null);

    // If it was a mention, ensure node is in context
    if (item.type === 'mention') {
        const currentContext = useChatStore.getState().contextNodeIds;
        if (!currentContext.includes(item.id)) {
            setContextNodeIds([...currentContext, item.id]);
        }
    }

    // Return focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

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
    if (suggestionMode && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        setSuggestionMode(null);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ws-input-container relative">
      {/* Suggestion Menu */}
      {suggestionMode && (
        <div className="absolute bottom-full left-0 w-full z-50">
          <ChatSuggestionMenu
            items={filteredSuggestions}
            activeIndex={activeIndex}
            onSelect={handleSelectSuggestion}
            onHover={setActiveIndex}
          />
        </div>
      )}

      {/* Search/Workflow Indicator (Placeholder style) */}
      <div className="ws-input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, @ to mention, / for workflows"
          disabled={disabled || isStreaming}
          rows={1}
          className="ws-textarea no-scrollbar"
          style={{ minHeight: '20px', maxHeight: '120px' }}
        />
      </div>

      <div className="ws-input-footer">
        <div className="ws-input-left flex items-center gap-2">
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="ws-mode-chip flex items-center gap-1.5 hover:bg-[var(--ws-border-dim)] transition-colors active:scale-95"
            >
               {activeModel.icon}
               <span className="text-[11px] font-medium">{activeModel.name}</span>
               <ChevronDown size={10} className={`text-[var(--ws-text-dim)] transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1e1e1e] border border-[var(--ws-border-dim)] rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="p-1">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors ${m.id === selectedModelId ? 'bg-[var(--amber)]/10 text-[var(--amber)]' : 'text-[var(--ws-text-sub)] hover:bg-white/[0.03] hover:text-[var(--ws-text-bold)]'}`}
                    >
                      <div className={`mt-0.5 ${m.id === selectedModelId ? 'text-[var(--amber)]' : 'text-[var(--ws-text-dim)]'}`}>
                        {m.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium leading-none">{m.name}</span>
                        <span className="text-[9px] text-[var(--ws-text-dim)] mt-1">{m.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Click outside listener (simplified with overlay) */}
            {isModelMenuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
            )}
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
