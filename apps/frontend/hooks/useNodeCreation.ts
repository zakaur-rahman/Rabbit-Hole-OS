'use client';

import { useCallback, useState } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';

interface UseNodeCreationParams {
    addNode: (node: any, persist?: boolean) => Promise<void>;
}

export function useNodeCreation({ addNode }: UseNodeCreationParams) {
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    const handleAddNote = useCallback(async () => {
        const nodeId = `note-${Date.now()}`;
        const newNode = {
            id: nodeId,
            type: 'note',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            style: { width: 350 },
            data: { title: 'New Note', content: '' },
        };
        addNode(newNode);
        try {
            await nodesApi.create({
                id: newNode.id, type: 'note', title: 'New Note',
                data: { ...newNode.data, position: newNode.position, whiteboard_id: useGraphStore.getState().activeWhiteboardId },
            });
        } catch (e) { console.error('Failed to sync note to backend:', e); }
    }, [addNode]);

    const handleAddGroup = useCallback(async () => {
        const nodeId = `group-${Date.now()}`;
        const newNode = {
            id: nodeId,
            type: 'group',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: 'New Section' },
            style: { width: 400, height: 300 },
        };
        addNode(newNode);
        try {
            await nodesApi.create({
                id: newNode.id, type: 'group', title: 'New Section',
                data: { ...newNode.data, position: newNode.position, style: newNode.style, whiteboard_id: useGraphStore.getState().activeWhiteboardId },
            });
        } catch (e) { console.error('Failed to sync group to backend:', e); }
    }, [addNode]);

    const handleAddText = useCallback(async () => {
        const nodeId = `text-${Date.now()}`;
        const newNode = {
            id: nodeId, type: 'text',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            style: { width: 250, height: 100 },
            data: { text: 'Type something...' },
        };
        addNode(newNode);
        try {
            await nodesApi.create({
                id: newNode.id, type: 'text', title: 'Text Node',
                data: { ...newNode.data, position: newNode.position, whiteboard_id: useGraphStore.getState().activeWhiteboardId },
            });
        } catch (e) { console.error('Failed to sync text to backend:', e); }
    }, [addNode]);

    const handleExport = useCallback(() => {
        const { nodes, edges } = useGraphStore.getState();
        import('@/lib/export').then(mod => mod.exportGraphToMarkdown(nodes, edges));
    }, []);

    const handleTemplateSelect = useCallback(async (template: any) => {
        setShowTemplateModal(false);
        const nodeId = `note-${Date.now()}`;
        const newNode = {
            id: nodeId, type: 'note',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { title: template.name, content: template.content, tags: template.tags },
        };
        addNode(newNode);
        try {
            await nodesApi.create({
                id: newNode.id, type: 'note', title: newNode.data.title,
                data: { ...newNode.data, position: newNode.position, whiteboard_id: useGraphStore.getState().activeWhiteboardId },
            });
        } catch (e) { console.error('Failed to create template node', e); }
    }, [addNode]);

    return {
        showTemplateModal, setShowTemplateModal,
        handleAddNote,
        handleAddGroup,
        handleAddText,
        handleExport,
        handleTemplateSelect,
    };
}
