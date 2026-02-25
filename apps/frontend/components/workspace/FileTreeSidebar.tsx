'use client';

import React, { useMemo } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';
import {
    FileText, Video, Code, ShoppingBag, BookOpen,
    StickyNote, Search, ChevronRight, ChevronDown,
    Folder, Ghost
} from 'lucide-react';

interface FileTreeSidebarProps {
    onSelectNode: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
    article: <FileText size={14} className="text-green-400" />,
    video: <Video size={14} className="text-red-400" />,
    code: <Code size={14} className="text-orange-400" />,
    product: <ShoppingBag size={14} className="text-purple-400" />,
    academic: <BookOpen size={14} className="text-blue-400" />,
    note: <StickyNote size={14} className="text-yellow-400" />,
    ghost: <Ghost size={14} className="text-neutral-500" />,
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
        const groups: Record<string, any[]> = {};
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
        <div className="h-full flex flex-col bg-neutral-900">
            {/* Search Header */}
            <div className="p-3 border-b border-neutral-800 space-y-2">
                <button
                    onClick={handleOpenDailyNote}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors border border-neutral-700"
                >
                    <StickyNote size={14} className="text-yellow-500" />
                    Open Today's Note
                </button>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Filter files..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-green-500 transition-colors"
                    />
                </div>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {nodes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-2">
                        <Ghost size={24} className="opacity-20" />
                        <span className="text-xs">No files in graph</span>
                    </div>
                )}

                {Object.entries(groupedNodes).map(([type, typeNodes]) => {
                    if (typeNodes.length === 0) return null;
                    const isExpanded = expandedTypes[type];

                    return (
                        <div key={type}>
                            <button
                                onClick={() => toggleType(type)}
                                className="w-full flex items-center gap-1.5 hover:bg-neutral-800 p-1.5 rounded transition-colors group"
                            >
                                <ChevronRight
                                    size={12}
                                    className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                                <Folder size={14} className="text-neutral-400 group-hover:text-white" />
                                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex-1 text-left">
                                    {type}s
                                </span>
                                <span className="text-[10px] text-neutral-600">
                                    {typeNodes.length}
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="ml-2 pl-2 border-l border-neutral-800 mt-1 space-y-0.5">
                                    {typeNodes.map(node => (
                                        <button
                                            key={node.id}
                                            onClick={() => onSelectNode(node.id)}
                                            className="w-full flex items-center gap-2 p-1.5 hover:bg-neutral-800 rounded transition-colors text-left group/item"
                                        >
                                            {typeIcons[node.type] || <FileText size={14} className="text-neutral-500" />}
                                            <span className="text-sm text-neutral-400 group-hover/item:text-white truncate">
                                                {node.data.title || 'Untitled'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
