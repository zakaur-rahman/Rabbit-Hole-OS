'use client';

import { useCallback, useRef, useState } from 'react';
import type { Edge as _FlowEdge, Connection, Node as FlowNode } from 'reactflow';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';

export interface ConnectionDropMenuState {
    visible: boolean;
    x: number;
    y: number;
    sourceNodeId: string | null;
    sourceHandleId: string | null;
}

interface UseConnectionDropParams {
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    addNode: (node: FlowNode, persist?: boolean) => Promise<void>;
    addEdge: (edge: _FlowEdge) => Promise<void>;
    activeWhiteboardId: string;
}

export function useConnectionDrop({ screenToFlowPosition, addNode, addEdge, activeWhiteboardId }: UseConnectionDropParams) {
    const [connectionDropMenu, setConnectionDropMenu] = useState<ConnectionDropMenuState>({
        visible: false, x: 0, y: 0, sourceNodeId: null, sourceHandleId: null,
    });

    const connectionStartRef = useRef<{ nodeId: string | null; handleId: string | null }>({ nodeId: null, handleId: null });
    const reconnectingEdgeRef = useRef<_FlowEdge | null>(null);
    const didConnectRef = useRef(false);

    const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null; handleId: string | null }) => {
        connectionStartRef.current = params;
        didConnectRef.current = false;
    }, []);

    const onReconnectStart = useCallback((_event: React.MouseEvent, edge: _FlowEdge) => {
        reconnectingEdgeRef.current = edge;
        didConnectRef.current = false;
    }, []);

    const onReconnect = useCallback((oldEdge: _FlowEdge, newConnection: Connection) => {
        if (!newConnection.source || !newConnection.target) return;
        didConnectRef.current = true;
        const { addEdge: storeAddEdge } = useGraphStore.getState();
        const newEdge = {
            ...oldEdge, ...newConnection,
            id: `e${newConnection.source}-${newConnection.sourceHandle || ''}-${newConnection.target}-${newConnection.targetHandle || ''}`,
        } as _FlowEdge;
        storeAddEdge(newEdge);
        if (newEdge.id !== oldEdge.id) useGraphStore.getState().removeEdge(oldEdge.id);
    }, []);

    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        if (didConnectRef.current) return;
        const target = event.target as HTMLElement;
        if (!target.classList.contains('react-flow__pane')) return;
        if (!('clientX' in event)) return;

        let { nodeId: sourceNodeId, handleId: sourceHandleId } = connectionStartRef.current;
        if (!sourceNodeId && reconnectingEdgeRef.current) {
            sourceNodeId = reconnectingEdgeRef.current.source;
            sourceHandleId = reconnectingEdgeRef.current.sourceHandle || null;
        }
        if (!sourceNodeId) {
            const el = document.querySelector('.react-flow__node.connecting');
            sourceNodeId = el?.getAttribute('data-id') || null;
        }

        setConnectionDropMenu({ visible: true, x: event.clientX, y: event.clientY, sourceNodeId, sourceHandleId });
    }, []);

    const handleConnectionDropAction = useCallback(async (action: string) => {
        const { x, y, sourceNodeId, sourceHandleId } = connectionDropMenu;
        const flowPos = screenToFlowPosition({ x, y });
        const nodeId = `${action}-${Date.now()}`;

        if (action === 'note') flowPos.x -= 225;
        else flowPos.x -= 100;

        let newNode: FlowNode | null = null;

        switch (action) {
            case 'note':
                newNode = { id: nodeId, type: 'note', position: flowPos, style: { width: 350 }, data: { title: 'New Note', content: '' } };
                break;
            case 'image':
                newNode = { id: nodeId, type: 'image', position: flowPos, style: { width: 300 }, data: { url: '' } };
                break;
            case 'pdf':
                newNode = { id: nodeId, type: 'pdf', position: flowPos, style: { width: 300, height: 400 }, data: { url: '' } };
                break;
            case 'instruction': {
                const store = useGraphStore.getState();
                const existingEdge = store.edges.find(e =>
                    e.target === sourceNodeId &&
                    store.nodes.find(n => n.id === e.source)?.type === 'comment'
                );
                if (existingEdge) {
                    if (!window.confirm('This node already has a system instruction. Replace it?')) {
                        reconnectingEdgeRef.current = null;
                        setConnectionDropMenu({ visible: false, x: 0, y: 0, sourceNodeId: null, sourceHandleId: null });
                        return;
                    }
                    store.removeNode(existingEdge.source);
                }
                newNode = { id: nodeId, type: 'comment', position: flowPos, style: { width: 300 }, data: { content: '', parentId: sourceNodeId } };
                break;
            }
            case 'article': {
                const url = prompt('Enter Web Page URL:');
                if (url) {
                    newNode = { id: nodeId, type: 'article', position: flowPos, style: { width: 350, height: 180 }, data: { title: 'Loading...', url } };
                    nodesApi.processUrl(url, activeWhiteboardId, nodeId).then(result => {
                        useGraphStore.getState().updateNode(nodeId, { title: result.title, snippet: result.snippet });
                    }).catch(console.error);
                }
                break;
            }
        }

        if (newNode) {
            await addNode(newNode as FlowNode, newNode.type !== 'article');

            if (reconnectingEdgeRef.current) {
                await addEdge({ ...reconnectingEdgeRef.current, target: newNode.id, targetHandle: null } as _FlowEdge);
            } else if (sourceNodeId) {
                let targetHandleId = 'top-target';
                if (sourceHandleId?.includes('right')) targetHandleId = 'left-target';
                else if (sourceHandleId?.includes('left')) targetHandleId = 'right-target';
                else if (sourceHandleId?.includes('top')) targetHandleId = 'bottom-target';
                else if (sourceHandleId?.includes('bottom')) targetHandleId = 'top-target';

                if (action === 'instruction') {
                    await addEdge({
                        id: `e${nodeId}-${sourceNodeId}`,
                        source: nodeId, target: sourceNodeId,
                        type: 'default', animated: true,
                        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
                    } as _FlowEdge);
                    useGraphStore.getState().updateNode(sourceNodeId!, { hasInstruction: true });
                    nodesApi.update(sourceNodeId!, { metadata: { hasInstruction: true } }).catch(() => {});
                } else {
                    await addEdge({
                        id: `e${sourceNodeId}-${sourceHandleId || ''}-${nodeId}-${targetHandleId}`,
                        source: sourceNodeId, sourceHandle: sourceHandleId,
                        target: nodeId, targetHandle: targetHandleId,
                    } as _FlowEdge);
                }
            }
        }

        reconnectingEdgeRef.current = null;
        setConnectionDropMenu({ visible: false, x: 0, y: 0, sourceNodeId: null, sourceHandleId: null });
    }, [connectionDropMenu, screenToFlowPosition, addNode, addEdge, activeWhiteboardId]);

    const closeConnectionDropMenu = useCallback(() => {
        reconnectingEdgeRef.current = null;
        setConnectionDropMenu(p => ({ ...p, visible: false }));
    }, []);

    return {
        connectionDropMenu, setConnectionDropMenu,
        connectionStartRef, reconnectingEdgeRef, didConnectRef,
        onConnectStart,
        onReconnectStart,
        onReconnect,
        onConnectEnd,
        handleConnectionDropAction,
        closeConnectionDropMenu,
    };
}
