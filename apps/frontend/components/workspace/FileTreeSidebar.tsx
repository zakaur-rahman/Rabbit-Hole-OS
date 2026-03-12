'use client';

import React, { useMemo } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';
import {
    FileText, Video, Code, ShoppingBag, BookOpen,
    StickyNote, Search, ChevronRight,
    Folder, Ghost
} from 'lucide-react';
import { Node } from 'reactflow';

interface FileTreeSidebarProps {
    onSelectNode: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
    article: <FileText size={14} className="text-[var(--green)]" />,
    video: <Video size={14} className="text-[var(--red)]" />,
    code: <Code size={14} className="text-[var(--amber)]" />,
    product: <ShoppingBag size={14} className="text-[var(--blue)]" />,
    academic: <BookOpen size={14} className="text-[var(--blue)]" />,
    note: <StickyNote size={14} className="text-[var(--amber)]" />,
    ghost: <Ghost size={14} className="text-[var(--muted)]" />,
};

export default function FileTreeSidebar({ onSelectNode }: FileTreeSidebarProps) {
    const { nodes } = useGraphStore();
    const [expandedTypes, setExpandedTypes] = React.useState<Record<string, boolean>>({
        note: true,
        article: true,
        video: true,
        code: true
    });
    const [search, setSearch] = React.useState('');

    // Group nodes by type
    const groupedNodes = useMemo(() => {
        const groups: Record<string, Node[]> = {};
        nodes.forEach((node) => {
            const type = node.type || 'other';
            if (!groups[type]) groups[type] = [];
            // Filter by search
            if (search && !node.data.title?.toLowerCase().includes(search.toLowerCase())) {
                return;
            }
            groups[type].push(node);
        });
        return groups;
    }, [nodes, search]);

    const toggleType = (type: string) => {
        setExpandedTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleOpenDailyNote = async () => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const nodeId = `journal-${dateStr}`;

        // Check if exists
        const existing = nodes.find(n => n.id === nodeId || n.data.title === dateStr);
        if (existing) {
            onSelectNode(existing.id);
            return;
        }

        // Create new
        const { addNode, activeWhiteboardId } = useGraphStore.getState();
        const newNode = {
            id: nodeId,
            type: 'note',
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
                title: dateStr,
                content: `# ${dateStr}\n\nRunning log for today.\n\n`,
                tags: ['daily']
            },
        };

        addNode(newNode);
        try {
            await nodesApi.create({
                id: newNode.id,
                type: 'note',
                title: newNode.data.title,
                data: {
                    ...newNode.data,
                    whiteboard_id: activeWhiteboardId
                }
            });
            onSelectNode(nodeId);
        } catch (e) {
            console.error('Failed to create daily note', e);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden">
            {/* Search Header */}
            <div className="p-3 border-b border-[var(--border)] flex flex-col gap-3">
                <button
                    onClick={handleOpenDailyNote}
                    className="w-full h-9 flex items-center justify-center gap-2 bg-[rgba(232,160,32,0.05)] hover:bg-[rgba(232,160,32,0.1)] text-[var(--amber)] rounded-[6px] text-[13px] font-bold transition-all border border-[rgba(232,160,32,0.2)]"
                >
                    <StickyNote size={14} className="text-[var(--amber)]" fill="rgba(232,160,32,0.2)" />
                    Open Today&apos;s Note
                </button>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sub)]" strokeWidth={1.5} />
                    <input
                        type="text"
                        placeholder="Filter files..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-[28px] bg-[#1a1918] border border-[var(--border)] rounded-[4px] pl-8 pr-3 text-[12px] font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition-colors placeholder:text-[var(--sub)] placeholder:tracking-wide font-medium"
                    />
                </div>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 no-scrollbar">
                {nodes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)] gap-2">
                        <Ghost size={24} className="opacity-20" />
                        <span className="text-[12px]">No files in graph</span>
                    </div>
                )}

                {Object.entries(groupedNodes).map(([type, typeNodes]) => {
                    if (typeNodes.length === 0) return null;
                    const isExpanded = expandedTypes[type];

                    return (
                        <div key={type} className="flex flex-col">
                            <button
                                onClick={() => toggleType(type)}
                                className="w-full flex items-center h-7 px-1 rounded hover:bg-[var(--raised)] transition-colors group"
                            >
                                <div className="w-4 flex justify-center text-[var(--sub)] transition-transform mr-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}>
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </div>
                                <Folder size={14} className="text-[#dec071] mr-2" fill="currentColor" opacity={0.9} />
                                <span className="text-[11px] font-bold text-[#b5a999] group-hover:text-[var(--text)] uppercase tracking-[0.15em] flex-1 text-left">
                                    {type}S
                                </span>
                                <span className="text-[10px] text-[var(--sub)] font-mono bg-[var(--raised)] border border-[var(--border2)] px-1.5 rounded-[4px] ml-2">
                                    {typeNodes.length}
                                </span>
                            </button>

                            <div className={`overflow-hidden transition-all duration-200 mt-1 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="flex flex-col gap-[2px]">
                                    {typeNodes.map(node => {
                                        const { selectedNodeId } = useGraphStore.getState();
                                        const isActive = selectedNodeId === node.id;
                                        
                                        return (
                                            <button
                                                key={node.id}
                                                onClick={() => onSelectNode(node.id)}
                                                className={`w-full h-[26px] flex items-center px-2 transition-colors text-left group/item relative ${
                                                    isActive 
                                                        ? 'bg-[#2a2723] border-l-2 border-[var(--amber)]' 
                                                        : 'hover:bg-[var(--raised)] border-l-2 border-transparent'
                                                }`}
                                            >
                                                <div className="w-4 mr-0.5 opacity-0 pointer-events-none" /> {/* Indent */}
                                                {(node.type && typeIcons[node.type]) || <FileText size={14} className="text-[var(--sub)]" />}
                                                <span className={`text-[12px] ml-2 truncate font-medium flex-1 ${isActive ? 'text-[var(--amber)]' : 'text-[#888] group-hover/item:text-[var(--text)]'}`}>
                                                    {node.data.title || 'Untitled'}
                                                </span>
                                                <span className="text-[10px] text-[#555] opacity-0 group-hover/item:opacity-100 transition-opacity ml-2 pointer-events-none lowercase tracking-wide">
                                                    today
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
