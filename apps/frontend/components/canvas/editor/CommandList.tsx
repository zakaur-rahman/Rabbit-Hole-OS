/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, FilePlus, CheckCheck, Briefcase } from 'lucide-react';

const icons: Record<string, any> = {
  Sparkles,
  FilePlus,
  CheckCheck,
  Briefcase,
};

const CommandList = forwardRef((props: { items: any[], command: (item: any) => void }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevItems, setPrevItems] = useState(props.items);

  if (props.items !== prevItems) {
    setPrevItems(props.items);
    setSelectedIndex(0);
  }

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));


  return (
    <div className="bg-[#1a1917] border border-[#333] rounded-xl overflow-hidden shadow-2xl p-1 w-[240px] backdrop-blur-2xl">
      <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-[#666] font-bold">
        AI Tools
      </div>
      {props.items.length > 0 ? (
        props.items.map((item: any, index: number) => {
          const Icon = icons[item.icon] || Sparkles;
          return (
            <button
              key={index}
              onClick={() => selectItem(index)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                index === selectedIndex
                  ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-l-2 border-[#fbbf24]'
                  : 'text-[#aaa] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-md ${index === selectedIndex ? 'bg-[#fbbf24]/20' : 'bg-[#333]/30'}`}>
                <Icon size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium leading-tight">{item.title}</span>
                <span className="text-[10px] opacity-60 font-normal">{item.description}</span>
              </div>
            </button>
          );
        })
      ) : (
        <div className="p-3 text-[11px] text-[#666] italic text-center">No results found</div>
      )}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export default CommandList;
