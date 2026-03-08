'use client';

import { useCallback } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';
import type { Node as FlowNode } from 'reactflow';

interface UseFileDropParams {
    addNode: (node: FlowNode, persist?: boolean) => Promise<void>;
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    activeWhiteboardId: string;
}

export function useFileDrop({ addNode, screenToFlowPosition, activeWhiteboardId }: UseFileDropParams) {
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDropReal = useCallback(async (event: React.DragEvent) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file) return;

        const isImg = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImg && !isPdf) return;

        const { filesApi } = await import('@/lib/api');
        try {
            const uploaded = await filesApi.upload(file);
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const type = isImg ? 'image' : 'pdf';
            const nodeId = `${type}-${Date.now()}`;
            const newNode = {
                id: nodeId, type,
                position,
                style: isImg ? { width: 300 } : { width: 300, height: 400 },
                data: { title: file.name, url: uploaded.url, tags: ['file'], whiteboard_id: activeWhiteboardId },
            };
            addNode(newNode as FlowNode);
            await nodesApi.create({
                id: newNode.id, type,
                title: newNode.data.title,
                data: { ...newNode.data, position: newNode.position, whiteboard_id: useGraphStore.getState().activeWhiteboardId },
            } as any);
        } catch (e) {
            console.error('File upload failed:', e);
        }
    }, [addNode, screenToFlowPosition, activeWhiteboardId]);

    return { onDragOver, onDropReal };
}
