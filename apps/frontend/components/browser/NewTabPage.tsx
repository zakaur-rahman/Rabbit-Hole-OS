import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

interface NewTabPageProps {
    onNavigate: (url: string) => void;
}

const STATIC_SHORTCUTS = [
    { title: 'YouTube', url: 'youtube.com', icon: '▶', type: 'text' },
    { title: 'GitHub', url: 'github.com', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
    ), type: 'jsx' },
    { title: 'Wikipedia', url: 'wikipedia.org', icon: 'W', type: 'text' },
];

export default function NewTabPage({ onNavigate }: NewTabPageProps) {
    const [query, setQuery] = useState('');
    const [time, setTime] = useState<Date>(new Date());
    const nodes = useGraphStore(s => s.nodes);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const recentNodes = useMemo(() => {
        return [...nodes]
            .filter(n => n.data?.url && n.data.url.startsWith('http'))
            .reverse()
            .slice(0, 4)
            .map(n => ({
                title: n.data.title || n.data.url,
                url: n.data.url as string,
                iconPath: n.data.favicon || null,
            }));
    }, [nodes]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        const urlOrSearch = query.includes('.') && !query.includes(' ') ? (query.startsWith('http') ? query : `https://${query}`) : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        onNavigate(urlOrSearch);
    };

    const formattedHours = time.getHours() % 12 || 12;
    const formattedMinutes = String(time.getMinutes()).padStart(2, '0');
    const period = time.getHours() >= 12 ? 'PM' : 'AM';
    const day = time.toLocaleDateString('en-US', { weekday: 'long' });
    const month = time.toLocaleDateString('en-US', { month: 'long' });
    const date = time.getDate();

    return (
        <div className="relative w-full h-full bg-[#0d0c0b] text-[#ede7dc] font-['Syne'] overflow-hidden flex flex-col items-center justify-center select-none">
            {/* ── BACKGROUND LAYERS ── */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Atmospheric gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_60%,rgba(232,160,32,0.06)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(91,143,212,0.04)_0%,transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(30,28,25,0.9)_0%,transparent_60%),linear-gradient(180deg,#0a0908_0%,#111008_40%,#0d0c09_100%)]" />
                
                {/* Fine grain texture */}
                <div 
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                />

                {/* Subtle grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(42,38,34,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(42,38,34,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />

                {/* Horizon glow line */}
                <div className="absolute bottom-[35%] left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-500/10 to-transparent" />
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                
                {/* Clock */}
                <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="text-[clamp(72px,10vw,110px)] font-extrabold tracking-[-0.03em] leading-none flex items-baseline drop-shadow-[0_0_60px_rgba(232,160,32,0.08)]">
                        <span>{formattedHours}</span>
                        <span className="text-[#e8a020] animate-pulse mx-1">:</span>
                        <span>{formattedMinutes}</span>
                        <span className="text-[0.4em] font-light text-[#7a7068] tracking-widest ml-3 uppercase align-super">{period}</span>
                    </div>
                    <div className="mt-4 font-mono text-[13px] tracking-[0.06em] text-[#7a7068]">
                        {day}, <span className="text-[#e8a020] font-medium">{month} {date}</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="w-full max-w-[540px] mb-14 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                    <form 
                        onSubmit={handleSearch}
                        className="group relative flex items-center h-[52px] bg-[#161412]/85 backdrop-blur-2xl border border-[#3a3530] rounded-full px-5 gap-4 transition-all duration-300 hover:border-[#3a3530]/80 hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] focus-within:border-amber-500/30 focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_3px_rgba(232,160,32,0.06)]"
                    >
                        <Search size={18} className="text-[#44403a] shrink-0" />
                        <input 
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[15px] font-normal text-[#ede7dc] placeholder-[#44403a] font-['Syne']"
                            placeholder="Search the web..."
                            autoFocus
                        />
                    </form>
                </div>

                {/* Shortcuts */}
                <div className="flex items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    {STATIC_SHORTCUTS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => onNavigate(s.url)}
                            className="group flex flex-col items-center gap-2.5 transition-transform duration-200 hover:-translate-y-1"
                        >
                            <div className="w-[52px] h-[52px] rounded-2xl bg-[#161412]/85 backdrop-blur-md border border-[#3a3530] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:border-amber-500 group-hover:shadow-[0_4px_24px_rgba(232,160,32,0.15)] overflow-hidden">
                                {s.type === 'jsx' ? (
                                    <div className="text-[#7a7068] transition-colors group-hover:text-[#ede7dc]">{s.icon as React.ReactNode}</div>
                                ) : (
                                    <span className="text-[20px] font-bold text-[#7a7068] transition-colors group-hover:text-[#ede7dc]">{s.icon as string}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide text-[#7a7068] transition-colors group-hover:text-[#ede7dc]">{s.title}</span>
                        </button>
                    ))}
                    
                    {/* Recent nodes */}
                    {recentNodes.map((n, i) => (
                        <button
                            key={`recent-${i}`}
                            onClick={() => onNavigate(n.url)}
                            className="group flex flex-col items-center gap-2.5 transition-transform duration-200 hover:-translate-y-1"
                        >
                            <div className="w-[52px] h-[52px] rounded-2xl bg-[#161412]/85 backdrop-blur-md border border-[#3a3530] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:border-amber-500 group-hover:shadow-[0_4px_24px_rgba(232,160,32,0.15)] overflow-hidden">
                                {n.iconPath ? (
                                    <img src={n.iconPath} alt="" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <Globe size={18} className="text-[#7a7068] group-hover:text-[#ede7dc] transition-colors" />
                                )}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide text-[#7a7068] transition-colors group-hover:text-[#ede7dc] truncate w-14 text-center">{n.title}</span>
                        </button>
                    ))}

                    <button className="group flex flex-col items-center gap-2.5 transition-transform duration-200 hover:-translate-y-1">
                        <div className="w-[52px] h-[52px] rounded-2xl bg-transparent border border-dashed border-[#44403a] flex items-center justify-center transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500 group">
                            <Plus size={20} className="text-[#44403a] group-hover:text-[#e8a020]" />
                        </div>
                        <span className="text-[10px] font-medium tracking-wide text-[#7a7068] group-hover:text-[#ede7dc]">Add</span>
                    </button>
                </div>
            </div>

            {/* SYNC STATUS WIDGET (Decorative) */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right-4 duration-1000 delay-500">
                <div className="flex items-center gap-2.5 bg-[#161412]/80 backdrop-blur-xl border border-[#3a3530] rounded-xl py-2.5 px-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] cursor-pointer hover:border-amber-500/40 transition-all hover:shadow-[0_4px_24px_rgba(232,160,32,0.12)]">
                    <div className="text-[#e8a020] text-sm">✎</div>
                    <div className="flex flex-col items-start translate-y-[1px]">
                        <span className="font-mono text-[9px] text-[#44403a] uppercase tracking-wider leading-none mb-1">Today&apos;s Note</span>
                        <span className="text-[11px] font-semibold text-[#7a7068] leading-none">Draft exploration...</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-[#161412]/70 backdrop-blur-md border border-[#2a2622] rounded-full py-1.5 px-3 text-[9px] font-mono text-[#44403a]">
                    <div className="w-1 h-1 rounded-full bg-[#4caf7d] animate-pulse" />
                    SYNCED 1m AGO
                </div>
            </div>

            {/* WATERMARK */}
            <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 animate-in fade-in slide-in-from-left-4 duration-1000 delay-500">
                <div className="w-[22px] h-[22px] bg-[#e8a020] rounded-md flex items-center justify-center text-[10px] font-black text-[#0d0c0b]">C</div>
                <span className="text-[11px] font-bold text-[#44403a] tracking-wider uppercase opacity-80">Cognode</span>
            </div>
        </div>
    );
}
