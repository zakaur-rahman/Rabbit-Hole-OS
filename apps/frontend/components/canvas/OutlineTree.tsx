'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

    return (
        <div className="flex flex-col">
            <div
                className={`group flex items-center gap-3 py-2 px-3.5 transition-all duration-200 cursor-pointer relative ${
                    isSelected || isIndeterminate
                    ? 'bg-(--amber)/5' 
                    : 'hover:bg-(--amber)/2'
                }`}
                onClick={() => onToggleSelect(item.id, item)}
            >
                {/* Hover accent line */}
                <div className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-(--amber) rounded-r transition-all duration-200 ${
                    isSelected || isIndeterminate ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 group-hover:opacity-100 group-hover:scale-y-100'
                }`} />

                <div className="flex items-center gap-1 min-w-[10px]">
                    <span className="font-mono text-[9px] text-(--muted) w-3 shrink-0 text-right">
                        {item.number}
                    </span>
                </div>

                <div className="flex-1 flex items-center gap-2 overflow-hidden ml-1">
                    <span className={`text-[13px] font-semibold tracking-tight transition-colors ${
                        isSelected || isIndeterminate ? 'text-(--text)' : 'text-(--sub) group-hover:text-(--text)'
                    } ${compact ? 'truncate' : ''}`}>
                        {item.title}
                    </span>
                </div>

                <div className="shrink-0 flex items-center">
                    <div className={`w-4 h-4 rounded border-1.5 flex items-center justify-center text-[9px] transition-all duration-200 ${
                        isSelected 
                        ? 'bg-(--amber) border-(--amber) text-(--bg) shadow-[0_0_8px_rgba(232,160,32,0.35)]' 
                        : isIndeterminate
                        ? 'bg-(--amber)/20 border-(--amber) text-(--amber)'
                        : 'bg-(--bg) border-(--border2) group-hover:border-(--amber) text-transparent'
                    }`}>
                        {isSelected ? '✓' : isIndeterminate ? '—' : '✓'}
                    </div>
                </div>
                
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(item.id);
                        }}
                        className="ml-1 p-0.5 hover:bg-(--raised) rounded transition-colors text-(--muted) hover:text-(--sub)"
                    >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                )}
            </div>

            {/* Divider */}
            <div className="mx-3.5 h-px bg-(--border)/50 opacity-50" />

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
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleToggleSelect = useCallback((id: string, item: OutlineItem) => {
        const nextSelected = new Set(selectedIds);
        const allIds = getAllDescendantIds(item);
        const currentState = getSelectionState(item, selectedIds);

        if (currentState === 'full') {
            allIds.forEach(id => nextSelected.delete(id));
        } else {
            allIds.forEach(id => nextSelected.add(id));
        }

        onSelectionChange(nextSelected);
    }, [selectedIds, onSelectionChange]);

    if (!items || items.length === 0) {
        return (
            <div className="text-(--muted) text-[10px] font-mono uppercase tracking-widest p-4 text-center">
                Awaiting Extraction
            </div>
        );
    }

    return (
        <div className="flex flex-col select-none w-full">
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
