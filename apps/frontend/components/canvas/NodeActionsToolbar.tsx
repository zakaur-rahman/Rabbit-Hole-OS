import { useState } from 'react';
import { NodeToolbar, Position } from 'reactflow';
import { Trash2, Palette, Sparkles } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useChatStore } from '@/store/chat.store';
import { nodesApi } from '@/lib/api';
import { ThemeColorName } from '@/types/nodeTheme';
import { NODE_THEMES } from '@/theme/nodeThemes';

interface NodeActionsToolbarProps {
    nodeId: string;
    isVisible: boolean;
    position?: Position;
    onMouseEnter?: () => void;
}

interface ColorOption {
    name: string;
    key: ThemeColorName;
    hex: string;
}

const COLORS: ColorOption[] = [
    { name: 'Red', key: 'red', hex: '#ef4444' },
    { name: 'Orange', key: 'orange', hex: '#f97316' },
    { name: 'Amber', key: 'amber', hex: '#f59e0b' },
    { name: 'Green', key: 'green', hex: '#22c55e' },
    { name: 'Emerald', key: 'emerald', hex: '#10b981' },
    { name: 'Teal', key: 'teal', hex: '#14b8a6' },
    { name: 'Cyan', key: 'cyan', hex: '#06b6d4' },
    { name: 'Blue', key: 'blue', hex: '#3b82f6' },
    { name: 'Indigo', key: 'indigo', hex: '#6366f1' },
    { name: 'Violet', key: 'violet', hex: '#8b5cf6' },
    { name: 'Purple', key: 'purple', hex: '#a855f7' },
    { name: 'Fuchsia', key: 'fuchsia', hex: '#d946ef' },
    { name: 'Pink', key: 'pink', hex: '#ec4899' },
    { name: 'Rose', key: 'rose', hex: '#f43f5e' },
];

export function NodeActionsToolbar({
    nodeId,
    isVisible,
    position = Position.Top,
    onMouseEnter
}: NodeActionsToolbarProps) {
    const { removeNode, nodes, updateNode, activeWhiteboardId, selectNode } = useGraphStore();
    const { openPanel, addMessage, setStreaming, setInitialInput } = useChatStore();
    const [showColors, setShowColors] = useState(false);

    const currentColor = nodes.find(n => n.id === nodeId)?.data?.color as ThemeColorName | undefined;

    const handleColorChange = (colorKey: ThemeColorName) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            const newData = { ...node.data, color: colorKey };
            updateNode(nodeId, newData);
            nodesApi.update(nodeId, {
                metadata: newData
            }).catch(() => {
                // Silently handle API errors — local state is already updated
            });
        }
        setShowColors(false);
    };

    const handleAIExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const title = node.data.title || 'this node';
        
        // Ensure this node is selected for context
        selectNode(nodeId);
        
        // Pre-fill prompt
        setInitialInput(`Expand on "${title}" by generating 5 related sub-topics and linking them to this node.`);
        
        openPanel();
    };

    return (
        <NodeToolbar
            isVisible={isVisible}
            position={position}
            className="flex flex-col items-center gap-2"
            onMouseEnter={onMouseEnter}
        >
            {showColors && (
                <div className="grid grid-cols-7 gap-1 p-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl mb-2">
                    {COLORS.map((color) => (
                        <button
                            key={color.key}
                            className="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                            style={{
                                backgroundColor: color.hex,
                                boxShadow: currentColor === color.key ? `0 0 0 2px #0e1012, 0 0 0 3px ${color.hex}` : undefined,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleColorChange(color.key);
                            }}
                            title={color.name}
                        />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 shadow-xl z-50">
                <button
                    className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this node from the graph?')) {
                            removeNode(nodeId);
                        }
                    }}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
                <div className="w-px h-4 bg-neutral-800" />
                <button
                    className={`p-1.5 hover:bg-neutral-800 rounded transition-colors ${showColors ? 'text-white bg-neutral-800' : 'text-neutral-400'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowColors(!showColors);
                    }}
                    title="Color"
                    style={{
                        color: currentColor ? NODE_THEMES[currentColor]?.primary : undefined,
                    }}
                >
                    <Palette size={14} />
                </button>
                <div className="w-px h-4 bg-neutral-800" />
                <button
                    className="p-1.5 hover:bg-neutral-800 rounded text-[var(--amber)] hover:text-[var(--amber-light)] transition-colors"
                    onClick={handleAIExpand}
                    title="Expand with AI"
                >
                    <Sparkles size={14} />
                </button>
            </div>
        </NodeToolbar>
    );
}
