import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

interface NewTabPageProps {
    onNavigate: (url: string) => void;
}

export default function NewTabPage({ onNavigate }: NewTabPageProps) {
    const [query, setQuery] = useState('');
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        onNavigate(query);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-900 relative overflow-hidden">
            {/* Background Gradient/Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop"
                    alt="Background"
                    className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]" />
            </div>

            <div className="z-10 flex flex-col items-center w-full max-w-2xl px-4 gap-8">
                {/* Logo / Time */}
                <div className="text-center h-32 flex flex-col items-center justify-center">
                    {time ? (
                        <>
                            <h1 className="text-8xl font-light text-white mb-2 tracking-tighter">
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </h1>
                            <p className="text-xl text-white/80 font-light">
                                {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </>
                    ) : (
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="h-24 w-64 bg-white/5 rounded-2xl" />
                            <div className="h-8 w-48 bg-white/5 rounded-xl" />
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="w-full relative group">
                    <div className="absolute inset-x-0 -inset-y-1 bg-white/20 rounded-full blur transition group-hover:bg-white/30" />
                    <div className="relative flex items-center bg-neutral-800/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-4 shadow-2xl">
                        <Search className="text-white/50 mr-4" size={24} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-xl text-white placeholder-white/50 font-light"
                            placeholder="Search the web..."
                            autoFocus
                        />
                    </div>
                </form>

                {/* Shortcuts */}
                <div className="grid grid-cols-4 md:grid-cols-5 gap-4 mt-8">
                    {[
                        { title: 'YouTube', url: 'youtube.com', icon: 'https://www.youtube.com/favicon.ico' },
                        { title: 'GitHub', url: 'github.com', icon: 'https://github.com/favicon.ico' },
                        { title: 'RabbitHole', url: 'localhost:3000', icon: 'https://google.com/favicon.ico' }, // Placeholder
                    ].map((shortcut, i) => (
                        <button
                            key={i}
                            onClick={() => onNavigate(shortcut.url)}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/10 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center p-2 shadow-lg group-hover:scale-110 transition-transform">
                                <img src={shortcut.icon} alt={shortcut.title} className="w-6 h-6" />
                            </div>
                            <span className="text-sm text-white/80 group-hover:text-white">{shortcut.title}</span>
                        </button>
                    ))}
                    <button className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/10 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform text-white/50 group-hover:text-white">
                            <Plus size={20} />
                        </div>
                        <span className="text-sm text-white/80 group-hover:text-white">Add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
