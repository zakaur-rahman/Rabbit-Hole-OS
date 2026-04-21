'use client';

import React from 'react';
import { Sparkles, FileText, Layout, PenTool, CheckCircle, Database } from 'lucide-react';

export type SuggestionType = 'mention' | 'command';

export interface SuggestionItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  type: SuggestionType;
}

interface ChatSuggestionMenuProps {
  items: SuggestionItem[];
  activeIndex: number;
  onSelect: (item: SuggestionItem) => void;
  onHover: (index: number) => void;
}

export default function ChatSuggestionMenu({ items, activeIndex, onSelect, onHover }: ChatSuggestionMenuProps) {
  if (items.length === 0) return null;

  return (
    <div className="ws-suggestion-menu bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl overflow-hidden mb-2 z-50">
      <div className="max-h-[240px] overflow-y-auto no-scrollbar py-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(item)}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
              index === activeIndex ? 'bg-[#2a2d2e] text-[#ccc]' : 'hover:bg-[#2a2d2e]/50 text-[#888]'
            }`}
          >
            <div className={`shrink-0 ${index === activeIndex ? 'text-[var(--ws-blue)]' : 'text-[#666]'}`}>
              {item.icon || <FileText size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-medium leading-tight truncate ${index === activeIndex ? 'text-[#eee]' : 'text-[#aaa]'}`}>
                  {item.title}
                </span>
                {item.type === 'command' && (
                    <span className="text-[10px] text-[var(--ws-blue)]/50 uppercase tracking-tighter">Command</span>
                )}
              </div>
              {item.description && (
                <div className="text-[10px] text-[#666] truncate mt-0.5 leading-tight italic">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-[#252525] border-t border-[#333] flex items-center justify-between text-[10px] text-[#555] font-medium">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
      </div>
    </div>
  );
}
