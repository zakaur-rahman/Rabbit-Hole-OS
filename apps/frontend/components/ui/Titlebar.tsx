'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WindowControls from '../window/WindowControls';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isMac, setIsMac] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
      setIsAuthenticated(hasToken);
    };

    checkAuth();

    const handleAuthStateChange = () => checkAuth();
    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('auth-state-changed', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
    };
  }, []);

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

  // Optional: Listen to IPC for maximize/unmaximize state if available
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronApi = (window as any).electron;
    if (electronApi?.window?.onMaximized) {
      electronApi.window.onMaximized(() => setIsMaximized(true));
    }
    if (electronApi?.window?.onUnmaximized) {
      electronApi.window.onUnmaximized(() => setIsMaximized(false));
    }
  }, []);

  return (
    <div
      className="h-[44px] bg-(--surface) border-b border-(--border) flex items-center shrink-0 select-none pb-px drag-region"
    >
      {isMac && (
        <div className="pl-4 pr-2 flex items-center h-full">
          <WindowControls isMac={isMac} isMaximized={isMaximized} />
        </div>
      )}

      <div className={`flex items-center gap-2 text-(--text) font-bold text-[13px] tracking-[0.02em] ${isMac ? '' : 'pl-4'}`}>
        <div className="w-[22px] h-[22px] bg-(--amber) rounded-[5px] flex items-center justify-center text-[10px] text-(--bg) font-extrabold no-drag-region">
          C
        </div>
        Cognode
      </div>

      <div className="flex gap-[2px] flex-1 pl-4">
        <div className="flex gap-[2px] bg-(--bg) border border-(--border) rounded-(--r) p-[3px] no-drag-region">
          <button
            onClick={() => setLeftPanelMode('browser')}
            className={`px-[14px] py-1 rounded-[3px] border-none font-sans text-[11px] font-medium cursor-pointer transition-all flex items-center gap-[6px] ${
              leftPanelMode === 'browser'
                ? 'bg-(--raised) text-(--text)'
                : 'bg-transparent text-(--sub) hover:text-(--text)'
            }`}
          >
            <span className="text-[12px] opacity-70">🌐</span> Browser
          </button>
          <button
            onClick={() => setLeftPanelMode('files')}
            className={`px-[14px] py-1 rounded-[3px] border-none font-sans text-[11px] font-medium cursor-pointer transition-all flex items-center gap-[6px] ${
              leftPanelMode === 'files'
                ? 'bg-(--raised) text-(--text)'
                : 'bg-transparent text-(--sub) hover:text-(--text)'
            }`}
          >
            <span className="text-[12px] opacity-70">⬡</span> Explorer
          </button>
        </div>
      </div>

      <div className="flex items-center bg-(--bg) border border-(--border) rounded-(--r) mr-2 px-3 py-1 gap-2 w-[260px] cursor-text transition-colors hover:border-(--border2) no-drag-region">
        <span className="text-(--sub) text-[12px]">⌕</span>
        <input
          type="text"
          placeholder="Search knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="bg-transparent border-none outline-none text-(--text) font-mono text-[11px] placeholder:text-(--sub) flex-1 min-w-0"
        />
        <span className="ml-auto bg-(--raised) border border-(--border) rounded-[3px] px-1.5 py-px font-mono text-[9px] text-(--muted)">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </span>
      </div>

      <div className={`flex items-center gap-2 ml-auto ${isMac ? 'pr-4' : 'pr-0'}`}>
        <button
          onClick={() => router.push('/synthesis')}
          className="h-[28px] rounded-(--r) border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] text-emerald-500 cursor-pointer font-sans text-[11px] font-semibold flex items-center justify-center px-3 w-auto gap-1.5 no-drag-region hover:bg-[rgba(16,185,129,0.1)] hover:border-[rgba(16,185,129,0.5)] transition-all"
          title="Live Agent Orchestration Pipeline"
        >
          ✨ Observability
        </button>
        
        <button
          onClick={onOpenLibrary}
          className="h-[28px] rounded-(--r) border border-(--border) bg-(--bg) text-(--text) cursor-pointer font-sans text-[11px] font-semibold flex items-center justify-center px-3 w-auto gap-1.5 no-drag-region hover:bg-(--raised) hover:border-(--border2) transition-all"
        >
          ⊞ Library
        </button>
        
        <button className="w-[28px] h-[28px] rounded-(--r) border border-(--border) bg-(--bg) text-(--sub) cursor-pointer flex items-center justify-center text-[13px] transition-all hover:bg-(--raised) hover:text-(--text) hover:border-(--border2) no-drag-region">
          🔔
        </button>

        <button
          onClick={onOpenSettings}
          className="w-[28px] h-[28px] rounded-(--r) border border-(--border) bg-(--bg) text-(--sub) cursor-pointer flex items-center justify-center text-[13px] transition-all hover:bg-(--raised) hover:text-(--text) hover:border-(--border2) no-drag-region"
        >
          ⚙
        </button>

        {!isAuthenticated && (
          <button
            onClick={() => router.push('/sign-in')}
            className="h-[28px] rounded-(--r) border border-(--amber)/30 bg-(--amber)/5 text-(--amber) cursor-pointer px-3 font-sans text-[11px] font-bold flex items-center gap-2 transition-all hover:bg-(--amber)/10 hover:border-(--amber)/50 hover:shadow-[0_0_12px_rgba(232,160,32,0.15)] no-drag-region"
          >
            <span className="text-[12px]">👤</span> Sign In
          </button>
        )}
        
        {!isMac && (
          <div className="flex h-[44px] items-start ml-2 -mt-px">
            <WindowControls isMac={false} isMaximized={isMaximized} />
          </div>
        )}
      </div>
    </div>
  );
}
