'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface TitlebarProps {
  onSearch?: (query: string) => void;
  leftPanelMode: 'browser' | 'files';
  setLeftPanelMode: (mode: 'browser' | 'files') => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}

export default function Titlebar({
  onSearch,
  leftPanelMode,
  setLeftPanelMode,
  onOpenLibrary,
  onOpenSettings,
}: TitlebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMac, setIsMac] = React.useState(true);
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsMac(navigator.userAgent.toLowerCase().includes('mac'));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const electronApi = (window as any).electron;
      if (electronApi?.window) {
          electronApi.window[action]();
      }
  };

  return (
    <div
      className="h-[44px] bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 gap-4 shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 text-[var(--text)] font-bold text-[13px] tracking-[0.02em]">
        <div className="w-[22px] h-[22px] bg-[var(--amber)] rounded-[5px] grid place-items-center text-[10px] text-[var(--bg)] font-extrabold">
          C
        </div>
        Cognode
      </div>

      <div className="flex gap-[2px] flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex gap-[2px] bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] p-[3px]">
          <button
            onClick={() => setLeftPanelMode('browser')}
            className={`px-[14px] py-1 rounded-[3px] border-none font-sans text-[11px] font-medium cursor-pointer transition-all flex items-center gap-[6px] ${
              leftPanelMode === 'browser'
                ? 'bg-[var(--raised)] text-[var(--text)]'
                : 'bg-transparent text-[var(--sub)] hover:text-[var(--text)]'
            }`}
          >
            <span className="text-[12px] opacity-70">🌐</span> Browser
          </button>
          <button
            onClick={() => setLeftPanelMode('files')}
            className={`px-[14px] py-1 rounded-[3px] border-none font-sans text-[11px] font-medium cursor-pointer transition-all flex items-center gap-[6px] ${
              leftPanelMode === 'files'
                ? 'bg-[var(--raised)] text-[var(--text)]'
                : 'bg-transparent text-[var(--sub)] hover:text-[var(--text)]'
            }`}
          >
            <span className="text-[12px] opacity-70">⬡</span> Explorer
          </button>
        </div>
      </div>

      <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] px-3 py-1.5 gap-2 w-[260px] cursor-text transition-colors hover:border-[var(--border2)]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-[var(--sub)] text-[12px]">⌕</span>
        <input
          type="text"
          placeholder="Search knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="bg-transparent border-none outline-none text-[var(--text)] font-mono text-[11px] placeholder:text-[var(--sub)] flex-1 min-w-0"
        />
        <span className="ml-auto bg-[var(--raised)] border border-[var(--border)] rounded-[3px] px-1.5 py-[1px] font-mono text-[9px] text-[var(--muted)]">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onOpenLibrary}
          className="h-[28px] rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] cursor-pointer grid place-items-center transition-all hover:bg-[var(--raised)] hover:border-[var(--border2)] px-3 w-auto gap-1.5 font-sans text-[11px] font-semibold flex items-center"
        >
          ⊞ Library
        </button>
        <button className="w-[28px] h-[28px] rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] text-[var(--sub)] cursor-pointer grid place-items-center text-[13px] transition-all hover:bg-[var(--raised)] hover:text-[var(--text)] hover:border-[var(--border2)]">
          🔔
        </button>
        <button
          onClick={onOpenSettings}
          className="w-[28px] h-[28px] rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] text-[var(--sub)] cursor-pointer grid place-items-center text-[13px] transition-all hover:bg-[var(--raised)] hover:text-[var(--text)] hover:border-[var(--border2)]"
        >
          ⚙
        </button>
        <div className="flex gap-1.5 ml-2">
          <div onClick={() => handleWindowControl('minimize')} className="w-3 h-3 rounded-full cursor-pointer bg-[#e8a020]"></div>
          <div onClick={() => handleWindowControl('maximize')} className="w-3 h-3 rounded-full cursor-pointer bg-[var(--muted)]"></div>
          <div onClick={() => handleWindowControl('close')} className="w-3 h-3 rounded-full cursor-pointer bg-[#e05555]"></div>
        </div>
      </div>
    </div>
  );
}
