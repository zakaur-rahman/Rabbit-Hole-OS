'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, MinusSquare } from 'lucide-react';

export interface OutlineItem {
    id: string;
    number: string;
    title: string;
    children: OutlineItem[];
}

interface OutlineTreeProps {
    items: OutlineItem[];
    selectedIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    compact?: boolean;
}

interface OutlineNodeProps {
    item: OutlineItem;
    level: number;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onToggleSelect: (id: string, item: OutlineItem) => void;
    compact?: boolean;
}

// Get all descendant IDs recursively
function getAllDescendantIds(item: OutlineItem): string[] {
    const ids: string[] = [item.id];
    for (const child of item.children) {
        ids.push(...getAllDescendantIds(child));
    }
    return ids;
}

// Check selection state of an item considering its children
function getSelectionState(item: OutlineItem, selectedIds: Set<string>): 'none' | 'partial' | 'full' {
    if (item.children.length === 0) {
        return selectedIds.has(item.id) ? 'full' : 'none';
    }

    const childStates = item.children.map(child => getSelectionState(child, selectedIds));
    const allFull = childStates.every(s => s === 'full');
    const allNone = childStates.every(s => s === 'none');

    // For parent nodes, 'full' means the parent itself AND all children are selected
    if (allFull && selectedIds.has(item.id)) return 'full';
    if (allNone && !selectedIds.has(item.id)) return 'none';
    return 'partial';
}

function OutlineNode({ item, level, selectedIds, expandedIds, onToggleExpand, onToggleSelect, compact }: OutlineNodeProps) {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const selectionState = getSelectionState(item, selectedIds);
    const isSelected = selectionState === 'full';
    const isIndeterminate = selectionState === 'partial';

    // The image shows quite aggressive indentation
    const paddingLeft = level * (compact ? 16 : 24);

    return (
        <div className="flex flex-col">
            <div
                className={`group flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer mb-0.5 ${isSelected || isIndeterminate
                    ? 'bg-blue-500/10 ring-1 ring-blue-500/15'
                    : 'hover:bg-neutral-800/50'
                    }`}
                style={{ marginLeft: `${paddingLeft}px` }}
                onClick={() => onToggleSelect(item.id, item)}
            >
                <div className="flex items-center gap-1 min-w-[20px]">
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(item.id);
                            }}
                            className="p-1 hover:bg-neutral-700/50 rounded-md transition-colors text-neutral-500 hover:text-neutral-300"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    <span className={`font-medium text-xs whitespace-nowrap ${isSelected || isIndeterminate ? 'text-blue-400' : 'text-neutral-500'
                        }`}>
                        {item.number}
                    </span>
                    <span className={`text-[13px] font-medium leading-tight ${isSelected || isIndeterminate ? 'text-white' : 'text-neutral-300 group-hover:text-neutral-200'
                        } ${compact ? 'truncate' : ''}`}>
                        {item.title}
                    </span>
                </div>

                <div className="shrink-0 flex items-center">
                    {isSelected ? (
                        <CheckSquare size={18} className="text-blue-500 fill-blue-500/10" strokeWidth={2.5} />
                    ) : isIndeterminate ? (
                        <MinusSquare size={18} className="text-blue-400 fill-blue-400/10" strokeWidth={2.5} />
                    ) : (
                        <Square size={18} className="text-neutral-700 group-hover:text-neutral-500 transition-colors" strokeWidth={2} />
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="flex flex-col">
                    {item.children.map((child) => (
                        <OutlineNode
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onToggleSelect={onToggleSelect}
                            compact={compact}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OutlineTree({ items, selectedIds, onSelectionChange, compact = false }: OutlineTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        // Start with all items collapsed
        return new Set();
    });

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleToggleSelect = useCallback((id: string, item: OutlineItem) => {
        const nextSelected = new Set(selectedIds);
        const allIds = getAllDescendantIds(item);
        const currentState = getSelectionState(item, selectedIds);

        if (currentState === 'full') {
            // Deselect self and all descendants
            allIds.forEach(id => nextSelected.delete(id));
        } else {
            // Select self and all descendants
            allIds.forEach(id => nextSelected.add(id));
        }

        onSelectionChange(nextSelected);
    }, [selectedIds, onSelectionChange]);

    if (!items || items.length === 0) {
        return (
            <div className="text-neutral-500 text-xs italic p-2 bg-neutral-900/50 rounded-xl border border-neutral-800">
                No structure extracted yet
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 select-none w-full">
            {items.map(item => (
                <OutlineNode
                    key={item.id}
                    item={item}
                    level={0}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    onToggleSelect={handleToggleSelect}
                    compact={compact}
                />
            ))}
        </div>
    );
}
