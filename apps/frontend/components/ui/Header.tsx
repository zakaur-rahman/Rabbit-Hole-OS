'use client';

import React from 'react';
import { Search, Bell, Settings, User, Rabbit, LayoutTemplate } from 'lucide-react';
import { CognodeLogo } from '../icons/cognode-logo';
interface HeaderProps {
    onSearch?: (query: string) => void;
    onToggleSidebar?: () => void;
}

export default function Header({ onSearch, onToggleSidebar }: HeaderProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(searchQuery);
        }
    };

    return (
        <header
            className="h-14 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 pr-[140px]"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
                <div className="w-6 p-[2px] h-6 rounded-lg bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <CognodeLogo />
                </div>
                <span className="font-semibold text-white text-lg tracking-wider">Cognode</span>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search knowledge..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-neutral-800 rounded">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <NavLink label="Explore" />
                <NavLink label="Research" active />
                <NavLink label="Library" />

                <div className="w-px h-6 bg-neutral-800 mx-2" />

                <button className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                    <Bell size={18} />
                </button>
                <button className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                    <Settings size={18} />
                </button>
                <button className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                </button>
            </div>
        </header>
    );
}

function NavLink({ label, active = false }: { label: string; active?: boolean }) {
    return (
        <button
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${active
                ? 'text-green-400 bg-green-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
        >
            {label}
        </button>
    );
}
