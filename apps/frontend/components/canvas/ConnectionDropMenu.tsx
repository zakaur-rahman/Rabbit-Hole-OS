'use client';

import React from 'react';
import { StickyNote, Globe, File as FileIcon, Image as ImageIcon, MessageSquare } from 'lucide-react';
import type { ConnectionDropMenuState } from '@/hooks/useConnectionDrop';

// ─── Connection Line Overlay ──────────────────────────────────────────────────

interface ConnectionLineOverlayProps {
    sourceNodeId: string;
    sourceHandleId: string | null;
    targetX: number;
    targetY: number;
}

function ConnectionLineOverlay({ sourceNodeId, sourceHandleId, targetX, targetY }: ConnectionLineOverlayProps) {
    const [startPos, setStartPos] = React.useState<{ x: number; y: number } | null>(null);

    React.useEffect(() => {
        const updatePos = () => {
            const nodeEl = document.querySelector(`.react-flow__node[data-id="${sourceNodeId}"]`);
            if (!nodeEl) return;
            let x: number | undefined, y: number | undefined;
            if (sourceHandleId) {
                const handleEl = nodeEl.querySelector(`.react-flow__handle[data-handleid="${sourceHandleId}"]`);
                if (handleEl) {
                    const rect = handleEl.getBoundingClientRect();
                    x = rect.left + rect.width / 2;
                    y = rect.top + rect.height / 2;
                }
            }
            if (!x || !y) {
                const rect = nodeEl.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
            setStartPos({ x, y });
        };
        updatePos();
        window.addEventListener('resize', updatePos);
        return () => window.removeEventListener('resize', updatePos);
    }, [sourceNodeId, sourceHandleId]);

    if (!startPos) return null;

    const { x: startX, y: startY } = startPos;
    const isHorizontal = sourceHandleId?.includes('left') || sourceHandleId?.includes('right');
    const path = isHorizontal
        ? `M${startX},${startY} C${(startX + targetX) / 2},${startY} ${(startX + targetX) / 2},${targetY} ${targetX},${targetY}`
        : `M${startX},${startY} C${startX},${(startY + targetY) / 2} ${targetX},${(startY + targetY) / 2} ${targetX},${targetY}`;

    return (
        <svg style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 999 }}>
            <path d={path} fill="none" stroke="#9ca3af" strokeWidth={2} />
        </svg>
    );
}

// ─── Connection Drop Menu ─────────────────────────────────────────────────────

interface ConnectionDropMenuProps {
    menu: ConnectionDropMenuState;
    onAction: (action: string) => void;
    onClose: () => void;
}

const ACTIONS = [
    { key: 'note', label: 'Add card', Icon: StickyNote },
    { key: 'article', label: 'Add web page', Icon: Globe },
    { key: 'image', label: 'Add image', Icon: ImageIcon },
    { key: 'pdf', label: 'Add PDF', Icon: FileIcon },
    { key: 'instruction', label: 'Add context instruction', Icon: MessageSquare },
] as const;

export default function ConnectionDropMenu({ menu, onAction, onClose }: ConnectionDropMenuProps) {
    if (!menu.visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* Menu */}
            <div
                className="fixed z-50 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
                style={{ left: menu.x, top: menu.y, transform: 'translateX(-50%)' }}
            >
                <div className="py-1">
                    {ACTIONS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 flex items-center gap-2"
                            onClick={() => onAction(key)}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* SVG connection line to menu */}
            {menu.sourceNodeId && (
                <ConnectionLineOverlay
                    sourceNodeId={menu.sourceNodeId}
                    sourceHandleId={menu.sourceHandleId}
                    targetX={menu.x}
                    targetY={menu.y}
                />
            )}
        </>
    );
}
