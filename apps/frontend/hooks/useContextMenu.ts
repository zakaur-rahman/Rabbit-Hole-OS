'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import React from 'react';
import { Scan, Scissors, Code, Copy, Clipboard, Trash2, BoxSelect, StickyNote, Globe, Lock, Unlock, Grid, File as FileIcon, Image as ImageIcon, Sparkles, MessageSquare } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';
import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

export interface ContextMenuState {
    x: number;
    y: number;
    visible: boolean;
}

export interface PaneContextMenuState extends ContextMenuState {
    flowPos?: { x: number; y: number };
}

export interface EdgeContextMenuState extends ContextMenuState {
    edgeId?: string;
}

interface UseContextMenuParams {
    selectNode: (id: string | null) => void;
    addNode: (node: FlowNode, persist?: boolean) => Promise<void>;
    addEdge: (edge: FlowEdge) => Promise<void>;
    activeWhiteboardId: string;
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    onFitSelection: () => void;
    handleSynthesis: (dummy?: boolean) => Promise<void>;
    showImportModal: boolean;
    setShowImportModal: (v: boolean) => void;
    setPendingWebPosition: (pos: { x: number; y: number } | null) => void;
    setShowWebUrlModal: (v: boolean) => void;
    pendingWebPosition: { x: number; y: number } | null;
}

export function useContextMenu({
    selectNode,
    addNode,
    addEdge,
    activeWhiteboardId,
    screenToFlowPosition,
    onFitSelection,
    handleSynthesis,
    setShowImportModal,
    setPendingWebPosition,
    setShowWebUrlModal,
    pendingWebPosition,
}: UseContextMenuParams) {

    // ── State ──────────────────────────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });
    const [paneContextMenu, setPaneContextMenu] = useState<PaneContextMenuState>({ x: 0, y: 0, visible: false });
    const [edgeContextMenu, setEdgeContextMenu] = useState<EdgeContextMenuState>({ x: 0, y: 0, visible: false });
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const clipboardRef = useRef<FlowNode[]>([]);

    const closeAll = useCallback(() => {
        setContextMenu(p => ({ ...p, visible: false }));
        setPaneContextMenu(p => ({ ...p, visible: false }));
        setEdgeContextMenu(p => ({ ...p, visible: false }));
    }, []);

    // ── Node context menu ──────────────────────────────────────────────────
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: FlowNode) => {
        event.preventDefault();
        setPaneContextMenu(p => ({ ...p, visible: false }));
        if (!node.selected) selectNode(node.id as string);
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
    }, [selectNode]);

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu(p => ({ ...p, visible: false }));
        setEdgeContextMenu(p => ({ ...p, visible: false }));
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setPaneContextMenu({ visible: true, x: event.clientX, y: event.clientY, flowPos });
    }, [screenToFlowPosition]);

    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: FlowEdge) => {
        event.preventDefault();
        setContextMenu(p => ({ ...p, visible: false }));
        setPaneContextMenu(p => ({ ...p, visible: false }));
        setEdgeContextMenu({ visible: true, x: event.clientX, y: event.clientY, edgeId: edge.id });
    }, []);

    // ── Edge action ────────────────────────────────────────────────────────
    const handleEdgeAction = useCallback((action: string) => {
        if (action === 'delete' && edgeContextMenu.edgeId) {
            useGraphStore.getState().removeEdge(edgeContextMenu.edgeId);
        }
        setEdgeContextMenu(p => ({ ...p, visible: false }));
    }, [edgeContextMenu.edgeId]);

    // ── Node context actions ───────────────────────────────────────────────
    const handleContextMenuAction = useCallback((action: string) => {
        const { nodes } = useGraphStore.getState();
        const selectedNodes = nodes.filter(n => n.selected);

        switch (action) {
            case 'add-instruction': {
                const node = selectedNodes[0];
                if (!node || selectedNodes.length !== 1) break;

                const store = useGraphStore.getState();
                const existingEdge = store.edges.find(e =>
                    e.target === node.id &&
                    store.nodes.find(n => n.id === e.source)?.type === 'comment'
                );

                if (existingEdge) {
                    if (!window.confirm('This node already has a system instruction. Replace it?')) break;
                    store.removeNode(existingEdge.source);
                }

                const commentId = `comment-${Date.now()}`;
                const commentNode = {
                    id: commentId, type: 'comment',
                    position: { x: node.position.x, y: node.position.y - 180 },
                    style: { width: 300 },
                    data: { content: '', parentId: node.id },
                    parentId: node.id,
                };
                addNode(commentNode as FlowNode);
                nodesApi.create({ ...commentNode, title: 'Instruction', data: { ...commentNode.data, whiteboard_id: activeWhiteboardId } });

                addEdge({
                    id: `e-${commentId}-${node.id}`,
                    source: commentId, target: node.id,
                    type: 'default', animated: true,
                    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
                } as FlowEdge);

                store.updateNode(node.id, { hasInstruction: true });
                nodesApi.update(node.id, { metadata: { hasInstruction: true } }).catch(() => {});
                break;
            }
            case 'zoom': onFitSelection(); break;

            case 'group': {
                if (selectedNodes.length === 0) break;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedNodes.forEach(n => {
                    const w = n.width || 200; const h = n.height || 100;
                    if (n.position.x < minX) minX = n.position.x;
                    if (n.position.y < minY) minY = n.position.y;
                    if (n.position.x + w > maxX) maxX = n.position.x + w;
                    if (n.position.y + h > maxY) maxY = n.position.y + h;
                });
                const p = 20;
                const groupId = `group-${Date.now()}`;
                const groupNode = {
                    id: groupId, type: 'group',
                    position: { x: minX - p, y: minY - 60 },
                    style: { width: maxX - minX + p * 2, height: maxY - minY + p + 60 },
                    data: { label: 'New Group' }, zIndex: -1,
                };
                addNode(groupNode as FlowNode);
                nodesApi.create({ ...groupNode, data: { ...groupNode.data, whiteboard_id: activeWhiteboardId }, title: 'Group' });
                break;
            }
            case 'cut':
                clipboardRef.current = JSON.parse(JSON.stringify(selectedNodes));
                selectedNodes.forEach(n => useGraphStore.getState().removeNode(n.id));
                break;
            case 'copy':
                clipboardRef.current = JSON.parse(JSON.stringify(selectedNodes));
                break;
            case 'paste': {
                if (clipboardRef.current.length === 0) break;
                const offset = { x: 50, y: 50 };
                clipboardRef.current.forEach((n, i) => {
                    const newId = `${n.type}-${Date.now()}-${i}`;
                    const newNode = { ...n, id: newId, position: { x: n.position.x + offset.x, y: n.position.y + offset.y }, selected: true };
                    addNode(newNode as FlowNode);
                    nodesApi.create({ ...newNode, title: newNode.data.title || newNode.type, data: { ...newNode.data, whiteboard_id: activeWhiteboardId } });
                });
                break;
            }
            case 'delete':
                selectedNodes.forEach(n => useGraphStore.getState().removeNode(n.id));
                break;
        }

        setContextMenu(p => ({ ...p, visible: false }));
    }, [addNode, addEdge, activeWhiteboardId, onFitSelection]);

    // ── Pane context actions ───────────────────────────────────────────────
    const handlePaneAction = useCallback((action: string) => {
        const { flowPos } = paneContextMenu;
        if (!flowPos && !['toggle-snap', 'toggle-readonly', 'import-canvas'].includes(action)) return;

        switch (action) {
            case 'add-note': {
                const id = `note-${Date.now()}`;
                addNode({ id, type: 'note', position: flowPos!, style: { width: 350 }, data: { title: 'New Note', content: '' } } as FlowNode);
                break;
            }
            case 'add-image': {
                const id = `image-${Date.now()}`;
                addNode({ id, type: 'image', position: flowPos!, style: { width: 300 }, data: { url: '' } } as FlowNode);
                break;
            }
            case 'add-pdf': {
                const id = `pdf-${Date.now()}`;
                addNode({ id, type: 'pdf', position: flowPos!, style: { width: 300, height: 400 }, data: { url: '' } } as FlowNode);
                break;
            }
            case 'add-web':
                setPendingWebPosition(flowPos!);
                setShowWebUrlModal(true);
                break;
            case 'create-group': {
                const id = `group-${Date.now()}`;
                const node = { id, type: 'group', position: flowPos!, style: { width: 400, height: 300 }, data: { label: 'New Group' }, zIndex: -1 };
                addNode(node as FlowNode);
                nodesApi.create({ ...node, type: 'group', title: 'Group', data: { ...node.data, whiteboard_id: activeWhiteboardId } });
                break;
            }
            case 'add-code': {
                const id = `code-${Date.now()}`;
                const node = { id, type: 'code', position: flowPos!, style: { width: 450, height: 350 }, data: { title: 'New Snippet', content: '', language: 'python' } };
                addNode(node as FlowNode);
                nodesApi.create({ ...node, type: 'code', title: 'New Snippet', data: { ...node.data, whiteboard_id: activeWhiteboardId } });
                break;
            }
            case 'import-canvas': setShowImportModal(true); break;
            case 'paste': {
                if (clipboardRef.current.length === 0 || !flowPos) break;
                let minX = Infinity, minY = Infinity;
                clipboardRef.current.forEach(n => { if (n.position.x < minX) minX = n.position.x; if (n.position.y < minY) minY = n.position.y; });
                clipboardRef.current.forEach((n, i) => {
                    const newId = `${n.type}-${Date.now()}-${i}`;
                    const newNode = { ...n, id: newId, position: { x: flowPos.x + (n.position.x - minX), y: flowPos.y + (n.position.y - minY) }, selected: true };
                    addNode(newNode as FlowNode);
                    nodesApi.create({ ...newNode, title: newNode.data.title || newNode.type, data: { ...newNode.data, whiteboard_id: activeWhiteboardId } });
                });
                break;
            }
            case 'toggle-snap': setSnapToGrid(p => !p); break;
            case 'toggle-readonly': setReadOnly(p => !p); break;
        }

        setPaneContextMenu(p => ({ ...p, visible: false }));
    }, [paneContextMenu, addNode, activeWhiteboardId, setPendingWebPosition, setShowWebUrlModal, setShowImportModal]);

    // ── Web URL submit ─────────────────────────────────────────────────────
    const handleWebUrlSubmit = useCallback((url: string) => {
        if (!pendingWebPosition) return;
        const nodeId = `web-${Date.now()}`;
        let domain = 'Web Page';
        try { domain = new URL(url).hostname.replace('www.', ''); } catch {}
        const newNode = {
            id: nodeId, type: 'web', position: pendingWebPosition,
            style: { width: 500, height: 400 },
            data: { url, title: domain, favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` },
        };
        addNode(newNode as FlowNode);
        nodesApi.create({ ...newNode, type: 'web', title: domain, data: { ...newNode.data, whiteboard_id: activeWhiteboardId } });
        setPendingWebPosition(null);
    }, [pendingWebPosition, addNode, activeWhiteboardId, setPendingWebPosition]);

    // ── Action arrays ──────────────────────────────────────────────────────
    const contextActions = useMemo(() => [
        { label: 'Add context instruction', onClick: () => handleContextMenuAction('add-instruction'), icon: React.createElement(MessageSquare, { size: 14 }) },
        { label: 'Zoom to selection', onClick: () => handleContextMenuAction('zoom'), icon: React.createElement(Scan, { size: 14 }) },
        { label: 'Create group', onClick: () => handleContextMenuAction('group'), icon: React.createElement(BoxSelect, { size: 14 }) },
        { separator: true, label: '', onClick: () => {} },
        { label: 'Cut', onClick: () => handleContextMenuAction('cut'), icon: React.createElement(Scissors, { size: 14 }), shortcut: 'Ctrl+X' },
        { label: 'Copy', onClick: () => handleContextMenuAction('copy'), icon: React.createElement(Copy, { size: 14 }), shortcut: 'Ctrl+C' },
        { label: 'Paste', onClick: () => handleContextMenuAction('paste'), icon: React.createElement(Clipboard, { size: 14 }), shortcut: 'Ctrl+V' },
        { separator: true, label: '', onClick: () => {} },
        { label: 'Delete', onClick: () => handleContextMenuAction('delete'), icon: React.createElement(Trash2, { size: 14 }), danger: true, shortcut: 'Del' },
    ], [handleContextMenuAction]);

    const paneActions = useMemo(() => [
        { label: 'Add card', onClick: () => handlePaneAction('add-note'), icon: React.createElement(StickyNote, { size: 14 }) },
        { label: 'Add web page', onClick: () => handlePaneAction('add-web'), icon: React.createElement(Globe, { size: 14 }) },
        { label: 'Add image', onClick: () => handlePaneAction('add-image'), icon: React.createElement(ImageIcon, { size: 14 }) },
        { label: 'Add PDF', onClick: () => handlePaneAction('add-pdf'), icon: React.createElement(FileIcon, { size: 14 }) },
        { label: 'Add code', onClick: () => handlePaneAction('add-code'), icon: React.createElement(Code, { size: 14 }) },
        { label: 'Import Canvas', onClick: () => handlePaneAction('import-canvas'), icon: React.createElement(BoxSelect, { size: 14 }) },
        { label: 'Create group', onClick: () => handlePaneAction('create-group'), icon: React.createElement(BoxSelect, { size: 14 }) },
        { separator: true, label: '', onClick: () => {} },
        { label: 'Paste', onClick: () => handlePaneAction('paste'), icon: React.createElement(Clipboard, { size: 14 }) },
        { separator: true, label: '', onClick: () => {} },
        { label: 'Snap to grid', onClick: () => handlePaneAction('toggle-snap'), icon: React.createElement(Grid, { size: 14 }) },
        { label: readOnly ? 'Enable editing' : 'Read-only', onClick: () => handlePaneAction('toggle-readonly'), icon: readOnly ? React.createElement(Unlock, { size: 14 }) : React.createElement(Lock, { size: 14 }) },
        { label: 'Generate Dummy Report', onClick: () => handleSynthesis(true), icon: React.createElement(Sparkles, { size: 14 }) },
    ], [handlePaneAction, readOnly, handleSynthesis]);

    const edgeActions = useMemo(() => [
        { label: 'Delete Edge', onClick: () => handleEdgeAction('delete'), icon: React.createElement(Trash2, { size: 14 }), danger: true, shortcut: 'Del' },
    ], [handleEdgeAction]);

    return {
        // State
        contextMenu, setContextMenu,
        paneContextMenu, setPaneContextMenu,
        edgeContextMenu, setEdgeContextMenu,
        snapToGrid, readOnly,
        clipboardRef,
        // Handlers
        closeAll,
        onNodeContextMenu,
        onPaneContextMenu,
        onEdgeContextMenu,
        handleEdgeAction,
        handleContextMenuAction,
        handlePaneAction,
        handleWebUrlSubmit,
        // Action arrays for ContextMenu component
        contextActions,
        paneActions,
        edgeActions,
    };
}
