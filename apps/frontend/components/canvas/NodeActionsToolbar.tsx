import { useState } from 'react';
import { NodeToolbar, Position } from 'reactflow';
import { Trash2, Palette, Scan, Copy, Edit2, Image as ImageIcon } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';

interface NodeActionsToolbarProps {
    nodeId: string;
    isVisible: boolean;
    position?: Position;
    onMouseEnter?: () => void;
}

const COLORS = [
    { name: 'Red', class: 'red-500', hex: '#ef4444' },
    { name: 'Orange', class: 'orange-500', hex: '#f97316' },
    { name: 'Amber', class: 'amber-500', hex: '#f59e0b' },
    { name: 'Green', class: 'green-500', hex: '#22c55e' },
    { name: 'Emerald', class: 'emerald-500', hex: '#10b981' },
    { name: 'Teal', class: 'teal-500', hex: '#14b8a6' },
    { name: 'Cyan', class: 'cyan-500', hex: '#06b6d4' },
    { name: 'Blue', class: 'blue-500', hex: '#3b82f6' },
    { name: 'Indigo', class: 'indigo-500', hex: '#6366f1' },
    { name: 'Violet', class: 'violet-500', hex: '#8b5cf6' },
    { name: 'Purple', class: 'purple-500', hex: '#a855f7' },
    { name: 'Fuchsia', class: 'fuchsia-500', hex: '#d946ef' },
    { name: 'Pink', class: 'pink-500', hex: '#ec4899' },
    { name: 'Rose', class: 'rose-500', hex: '#f43f5e' },
];

// Tailwind Safelist due to dynamic string interpolation in BaseNode
// Colors: Red, Orange, Amber, Green, Emerald, Teal, Cyan, Blue, Indigo, Violet, Purple, Fuchsia, Pink, Rose
// border-red-500 border-orange-500 border-amber-500 border-green-500 border-emerald-500 border-teal-500 border-cyan-500 border-blue-500 border-indigo-500 border-violet-500 border-purple-500 border-fuchsia-500 border-pink-500 border-rose-500
// shadow-red-500/10 shadow-orange-500/10 shadow-amber-500/10 shadow-green-500/10 shadow-emerald-500/10 shadow-teal-500/10 shadow-cyan-500/10 shadow-blue-500/10 shadow-indigo-500/10 shadow-violet-500/10 shadow-purple-500/10 shadow-fuchsia-500/10 shadow-pink-500/10 shadow-rose-500/10
// shadow-red-500/20 shadow-orange-500/20 shadow-amber-500/20 shadow-green-500/20 shadow-emerald-500/20 shadow-teal-500/20 shadow-cyan-500/20 shadow-blue-500/20 shadow-indigo-500/20 shadow-violet-500/20 shadow-purple-500/20 shadow-fuchsia-500/20 shadow-pink-500/20 shadow-rose-500/20
// ring-red-500/20 ring-orange-500/20 ring-amber-500/20 ring-green-500/20 ring-emerald-500/20 ring-teal-500/20 ring-cyan-500/20 ring-blue-500/20 ring-indigo-500/20 ring-violet-500/20 ring-purple-500/20 ring-fuchsia-500/20 ring-pink-500/20 ring-rose-500/20
// ring-red-500/30 ring-orange-500/30 ring-amber-500/30 ring-green-500/30 ring-emerald-500/30 ring-teal-500/30 ring-cyan-500/30 ring-blue-500/30 ring-indigo-500/30 ring-violet-500/30 ring-purple-500/30 ring-fuchsia-500/30 ring-pink-500/30 ring-rose-500/30
// via-red-500/50 via-orange-500/50 via-amber-500/50 via-green-500/50 via-emerald-500/50 via-teal-500/50 via-cyan-500/50 via-blue-500/50 via-indigo-500/50 via-violet-500/50 via-purple-500/50 via-fuchsia-500/50 via-pink-500/50 via-rose-500/50
// bg-red-500/10 bg-orange-500/10 bg-amber-500/10 bg-green-500/10 bg-emerald-500/10 bg-teal-500/10 bg-cyan-500/10 bg-blue-500/10 bg-indigo-500/10 bg-violet-500/10 bg-purple-500/10 bg-fuchsia-500/10 bg-pink-500/10 bg-rose-500/10
// text-red-500 text-orange-500 text-amber-500 text-green-500 text-emerald-500 text-teal-500 text-cyan-500 text-blue-500 text-indigo-500 text-violet-500 text-purple-500 text-fuchsia-500 text-pink-500 text-rose-500
// text-red-400 text-orange-400 text-amber-400 text-green-400 text-emerald-400 text-teal-400 text-cyan-400 text-blue-400 text-indigo-400 text-violet-400 text-purple-400 text-fuchsia-400 text-pink-400 text-rose-400
// placeholder-red-500/50 placeholder-orange-500/50 placeholder-amber-500/50 placeholder-green-500/50 placeholder-emerald-500/50 placeholder-teal-500/50 placeholder-cyan-500/50 placeholder-blue-500/50 placeholder-indigo-500/50 placeholder-violet-500/50 placeholder-purple-500/50 placeholder-fuchsia-500/50 placeholder-pink-500/50 placeholder-rose-500/50
// !bg-red-500 !bg-orange-500 !bg-amber-500 !bg-green-500 !bg-emerald-500 !bg-teal-500 !bg-cyan-500 !bg-blue-500 !bg-indigo-500 !bg-violet-500 !bg-purple-500 !bg-fuchsia-500 !bg-pink-500 !bg-rose-500
// !border-red-500 !border-orange-500 !border-amber-500 !border-green-500 !border-emerald-500 !border-teal-500 !border-cyan-500 !border-blue-500 !border-indigo-500 !border-violet-500 !border-purple-500 !border-fuchsia-500 !border-pink-500 !border-rose-500
// border-red-500/50 border-orange-500/50 border-amber-500/50 border-green-500/50 border-emerald-500/50 border-teal-500/50 border-cyan-500/50 border-blue-500/50 border-indigo-500/50 border-violet-500/50 border-purple-500/50 border-fuchsia-500/50 border-pink-500/50 border-rose-500/50
// border-red-500/30 border-orange-500/30 border-amber-500/30 border-green-500/30 border-emerald-500/30 border-teal-500/30 border-cyan-500/30 border-blue-500/30 border-indigo-500/30 border-violet-500/30 border-purple-500/30 border-fuchsia-500/30 border-pink-500/30 border-rose-500/30
// hover:border-red-500 hover:border-orange-500 hover:border-amber-500 hover:border-green-500 hover:border-emerald-500 hover:border-teal-500 hover:border-cyan-500 hover:border-blue-500 hover:border-indigo-500 hover:border-violet-500 hover:border-purple-500 hover:border-fuchsia-500 hover:border-pink-500 hover:border-rose-500
// hover:border-red-500/80 hover:border-orange-500/80 hover:border-amber-500/80 hover:border-green-500/80 hover:border-emerald-500/80 hover:border-teal-500/80 hover:border-cyan-500/80 hover:border-blue-500/80 hover:border-indigo-500/80 hover:border-violet-500/80 hover:border-purple-500/80 hover:border-fuchsia-500/80 hover:border-pink-500/80 hover:border-rose-500/80
// hover:border-red-500/90 hover:border-orange-500/90 hover:border-amber-500/90 hover:border-green-500/90 hover:border-emerald-500/90 hover:border-teal-500/90 hover:border-cyan-500/90 hover:border-blue-500/90 hover:border-indigo-500/90 hover:border-violet-500/90 hover:border-purple-500/90 hover:border-fuchsia-500/90 hover:border-pink-500/90 hover:border-rose-500/90

export function NodeActionsToolbar({
    nodeId,
    isVisible,
    position = Position.Top,
    onMouseEnter
}: NodeActionsToolbarProps) {
    const { removeNode, nodes, updateNode } = useGraphStore();
    const [showColors, setShowColors] = useState(false);

    const handleColorChange = (colorClass: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            const newData = { ...node.data, color: colorClass };
            updateNode(nodeId, newData);
            nodesApi.update(nodeId, {
                metadata: newData
            }).catch(console.error);
        }
        setShowColors(false);
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
                            key={color.class}
                            className={`w-4 h-4 rounded-full hover:scale-125 transition-transform`}
                            style={{ backgroundColor: color.hex }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleColorChange(color.class);
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
                        removeNode(nodeId);
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
                >
                    <Palette size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Focus">
                    <Scan size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Duplicate">
                    <Copy size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Edit">
                    <Edit2 size={14} />
                </button>
                <button className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Change Image">
                    <ImageIcon size={14} />
                </button>
            </div>
        </NodeToolbar>
    );
}
