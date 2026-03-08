'use client';

import { useCallback, useState } from 'react';
import { useReactFlow, type Node as FlowNode } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';

interface UseNodeCreationParams {
    addNode: (node: FlowNode, persist?: boolean) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a canvas position near the current viewport center, with a small
 * random jitter so that rapidly-created nodes don't perfectly overlap.
 */
function getViewportCenter(getViewport: () => { x: number; y: number; zoom: number }): { x: number; y: number } {
    if (typeof window === 'undefined') return { x: 200, y: 200 };
    const vp = getViewport();
    const centerX = (-vp.x + window.innerWidth / 2) / vp.zoom;
    const centerY = (-vp.y + window.innerHeight / 2) / vp.zoom;
    // ±60 px jitter so successive nodes fan out slightly
    return {
        x: centerX + (Math.random() * 120 - 60),
        y: centerY + (Math.random() * 120 - 60),
    };
}

/**
 * Persists a node to the backend.  Called fire-and-forget after optimistic
 * local creation so the UI never blocks on the network.
 */
async function persistNode(node: {
    id: string;
    type: string;
    title: string;
    data: Record<string, unknown>;
    position: { x: number; y: number };
    style?: Record<string, unknown>;
}) {
    const whiteboardId = useGraphStore.getState().activeWhiteboardId;
    try {
        await nodesApi.create({
            id: node.id,
            type: node.type,
            title: node.title,
            data: { ...node.data, position: node.position, style: node.style, whiteboard_id: whiteboardId } as any,
        });
    } catch (e) {
        console.error(`[useNodeCreation] Failed to sync ${node.type} node to backend:`, e);
    }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNodeCreation({ addNode }: UseNodeCreationParams) {
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const { getViewport } = useReactFlow();

    // ── Add Note ─────────────────────────────────────────────────────────────
    const handleAddNote = useCallback(async () => {
        const nodeId = `note-${Date.now()}`;
        const position = getViewportCenter(getViewport);
        const newNode = {
            id: nodeId,
            type: 'note',
            position,
            style: { width: 350 },
            data: { title: 'New Note', content: '' },
        };
        addNode(newNode);
        persistNode({ id: nodeId, type: 'note', title: 'New Note', data: newNode.data, position });
    }, [addNode, getViewport]);

    // ── Add Group ────────────────────────────────────────────────────────────
    const handleAddGroup = useCallback(async () => {
        const nodeId = `group-${Date.now()}`;
        const position = getViewportCenter(getViewport);
        const style = { width: 400, height: 300 };
        const newNode = {
            id: nodeId,
            type: 'group',
            position,
            data: { label: 'New Section' },
            style,
        };
        addNode(newNode);
        persistNode({ id: nodeId, type: 'group', title: 'New Section', data: newNode.data, position, style });
    }, [addNode, getViewport]);

    // ── Add Text ─────────────────────────────────────────────────────────────
    const handleAddText = useCallback(async () => {
        const nodeId = `text-${Date.now()}`;
        const position = getViewportCenter(getViewport);
        const style = { width: 250, height: 100 };
        const newNode = {
            id: nodeId,
            type: 'text',
            position,
            style,
            data: { text: 'Type something...' },
        };
        addNode(newNode);
        persistNode({ id: nodeId, type: 'text', title: 'Text Node', data: newNode.data, position, style });
    }, [addNode, getViewport]);

    // ── Export ───────────────────────────────────────────────────────────────
    const handleExport = useCallback(() => {
        const { nodes, edges } = useGraphStore.getState();
        import('@/lib/export').then(mod => mod.exportGraphToMarkdown(nodes, edges));
    }, []);

    // ── Template Select ──────────────────────────────────────────────────────
    const handleTemplateSelect = useCallback(async (template: { name: string; content: string; tags?: string[] }) => {
        setShowTemplateModal(false);
        const nodeId = `note-${Date.now()}`;
        const position = getViewportCenter(getViewport);
        const data = { title: template.name, content: template.content, tags: template.tags };
        const newNode = { id: nodeId, type: 'note', position, data };
        addNode(newNode);
        persistNode({ id: nodeId, type: 'note', title: template.name, data, position });
    }, [addNode, getViewport]);

    return {
        showTemplateModal, setShowTemplateModal,
        handleAddNote,
        handleAddGroup,
        handleAddText,
        handleExport,
        handleTemplateSelect,
    };
}
