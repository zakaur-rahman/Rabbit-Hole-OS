'use client';

import React, { useEffect, useRef } from 'react';

interface Action {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    shortcut?: string;
    danger?: boolean;
    separator?: boolean;
}

interface ContextMenuProps {
    position: { x: number; y: number };
    actions: Action[];
    onClose: () => void;
}

export default function ContextMenu({ position, actions, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep within viewport
    // (Simple implementation: just clamp or render. For now, render exactly at cursor)
    console.log("ContextMenu rendered at", position);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[180px] bg-neutral-900/95 backdrop-blur border border-neutral-800 rounded-lg shadow-xl p-1 overflow-hidden"
            style={{ top: position.y, left: position.x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {actions.map((action, index) => (
                action.separator ? (
                    <div key={index} className="h-px bg-neutral-800 my-1 mx-1" />
                ) : (
                    <button
                        key={index}
                        onClick={() => {
                            action.onClick();
                            onClose();
                        }}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors
                            ${action.danger
                                ? 'text-red-400 hover:bg-neutral-800 hover:text-red-300'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }
                        `}
                    >
                        {action.icon && <span className="w-4 h-4 flex items-center justify-center">{action.icon}</span>}
                        <span className="flex-1">{action.label}</span>
                        {action.shortcut && <span className="text-neutral-500 text-[10px]">{action.shortcut}</span>}
                    </button>
                )
            ))}
        </div>
    );
}
