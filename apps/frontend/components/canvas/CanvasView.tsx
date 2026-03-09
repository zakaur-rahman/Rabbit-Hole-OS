'use client';

import React, { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
    useReactFlow,
    Background,
    MiniMap,
    Connection,
    Edge as FlowEdge,
    ReactFlowProvider,
    SelectionMode,
    ConnectionMode,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi } from '@/lib/api';

import { ASTEditorModal } from '../modals/ASTEditorModal';
import dynamic from 'next/dynamic';

// Node types
import ArticleNode from './nodes/ArticleNode';
import VideoNode from './nodes/VideoNode';
import SynthesisNode from './nodes/SynthesisNode';
import ProductNode from './nodes/ProductNode';
import CodeNode from './nodes/CodeNode';
import AcademicNode from './nodes/AcademicNode';
import GhostNode from './nodes/GhostNode';
import NoteNode from './nodes/NoteNode';
import GroupNode from './nodes/GroupNode';
import TextNode from './nodes/TextNode';
import AnnotationNode from './nodes/AnnotationNode';
import ImageNode from './nodes/ImageNode';
import CanvasNode from './nodes/CanvasNode';
import WebNode from './nodes/WebNode';
import CommentNode from './nodes/CommentNode';

const PdfNode = dynamic(() => import('./nodes/PdfNode'), { ssr: false });

// Layout / UI
import GraphControls from './GraphControls';
import SynthesisModal from '../synthesis/SynthesisModal';
import ResearchPdfModal from '../modals/ResearchPdfModal';
import EmptyGraphState from './EmptyGraphState';
import WhiteboardSelector from './WhiteboardSelector';
import TemplateModal from '../modals/TemplateModal';
import ContextMenu from '../ui/ContextMenu';
import CanvasImportModal from '../modals/CanvasImportModal';
import WebUrlModal from '../modals/WebUrlModal';
import CanvasOverlay from './CanvasOverlay';
import ConnectionDropMenu from './ConnectionDropMenu';

// Hooks
import { useContextMenu } from '@/hooks/useContextMenu';
import { useNodeCreation } from '@/hooks/useNodeCreation';
import { useConnectionDrop } from '@/hooks/useConnectionDrop';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useSynthesis } from '@/hooks/useSynthesis';

// ─── Node type registry (stable reference outside component) ─────────────────
const nodeTypes = {
    article: ArticleNode,
    video: VideoNode,
    synthesis: SynthesisNode,
    product: ProductNode,
    code: CodeNode,
    academic: AcademicNode,
    ghost: GhostNode,
    note: NoteNode,
    image: ImageNode,
    pdf: PdfNode,
    group: GroupNode,
    text: TextNode,
    annotation: AnnotationNode,
    canvas: CanvasNode,
    web: WebNode,
    comment: CommentNode,
} as const;

const edgeTypes = {};

// ─── Props ───────────────────────────────────────────────────────────────────
interface CanvasViewProps {
    onNodeOpen?: (nodeId: string) => void;
    onPaneClick?: () => void;
}

// ─── Inner component (must be inside ReactFlowProvider) ──────────────────────
function CanvasViewInner({ onNodeOpen, onPaneClick: onPaneClickProp }: CanvasViewProps) {
    const {
        nodes, edges,
        onNodesChange, onEdgesChange,
        addEdge: addStoreEdge,
        selectNode,
        addNode,
        fetchNodes,
        activeWhiteboardId,
    } = useGraphStore();

    // ── Synthesis (PDF + AST) ────────────────────────────────────────────────
    const [showSynthesis, setShowSynthesis] = useState(false);
    const {
        showPdfModal, setShowPdfModal,
        pdfUrl,
        isSynthesizing, synthesisStage, synthesisMessage, synthesisError,
        showASTEditor, setShowASTEditor,
        initialAST,
        handleSynthesis,
        handleOpenASTEditor,
    } = useSynthesis();

    const handleOpenAdvancedEditor = useCallback(() => {
        setShowPdfModal(false);
        handleOpenASTEditor();
    }, [handleOpenASTEditor, setShowPdfModal]);

    // Compile AST → PDF from ASTEditorModal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCompileAST = useCallback(async (ast: any): Promise<Blob> => {
        const { synthesisApi } = await import('@/lib/api');
        setShowASTEditor(false);
        const blob = await synthesisApi.generatePdfFromAST(ast);
        setShowPdfModal(true);
        return blob;
    }, [setShowASTEditor, setShowPdfModal]);


    // ── ReactFlow utilities ──────────────────────────────────────────────────
    const { screenToFlowPosition, fitView: flowFitView, getNodes: flowGetNodes } = useReactFlow();

    const onFitSelection = useCallback(() => {
        const sel = flowGetNodes().filter(n => n.selected);
        if (sel.length > 0) flowFitView({ nodes: sel, padding: 0.2, duration: 800 });
    }, [flowFitView, flowGetNodes]);

    // ── Modal state for web URL + import (shared between hooks) ─────────────
    const [showImportModal, setShowImportModal] = useState(false);
    const [showWebUrlModal, setShowWebUrlModal] = useState(false);
    const [pendingWebPosition, setPendingWebPosition] = useState<{ x: number; y: number } | null>(null);

    // ── Context menus ────────────────────────────────────────────────────────
    const {
        contextMenu, setContextMenu,
        paneContextMenu, setPaneContextMenu,
        edgeContextMenu, setEdgeContextMenu,
        snapToGrid, readOnly,
        onNodeContextMenu,
        onPaneContextMenu,
        onEdgeContextMenu,
        handleWebUrlSubmit,
        contextActions, paneActions, edgeActions,
    } = useContextMenu({
        selectNode, addNode, addEdge: addStoreEdge,
        activeWhiteboardId,
        screenToFlowPosition,
        onFitSelection,
        handleSynthesis,
        showImportModal, setShowImportModal,
        setPendingWebPosition, setShowWebUrlModal,
        pendingWebPosition,
    });

    // ── Node creation (GraphControls buttons) ────────────────────────────────
    const {
        showTemplateModal, setShowTemplateModal,
        handleAddNote, handleAddGroup, handleAddText,
        handleTemplateSelect,
    } = useNodeCreation({ addNode });

    // ── Connection drop ──────────────────────────────────────────────────────
    const {
        connectionDropMenu,
        onConnectStart, onReconnectStart, onReconnect,
        onConnectEnd,
        handleConnectionDropAction,
        closeConnectionDropMenu,
        didConnectRef,
    } = useConnectionDrop({ screenToFlowPosition, addNode, addEdge: addStoreEdge, activeWhiteboardId });

    // ── File drop ────────────────────────────────────────────────────────────
    const { onDragOver, onDropReal } = useFileDrop({ addNode, screenToFlowPosition, activeWhiteboardId });

    // ── Fetch on mount / whiteboard change ───────────────────────────────────
    React.useEffect(() => { fetchNodes(); }, [fetchNodes, activeWhiteboardId]);

    // ── Hover preview ────────────────────────────────────────────────────────
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout>(null);
    const onNodeMouseEnter = useCallback((_event: React.MouseEvent, _node: unknown) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        // Hover preview is currently disabled — placeholder for re-enabling
    }, []);
    const onNodeMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    }, []);

    // ── Connection validation ─────────────────────────────────────────────────
    const isValidConnection = useCallback((connection: Connection) => {
        const { nodes, edges } = useGraphStore.getState();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        if (targetNode?.type === 'comment') return false;
        if (sourceNode?.type === 'comment') {
            if (edges.some(e => e.source === connection.source)) return false;
            if (edges.some(e => e.target === connection.target && nodes.find(n => n.id === e.source)?.type === 'comment')) return false;
            if (connection.source === connection.target) return false;
        }
        return true;
    }, []);

    const onConnect = useCallback((params: Connection) => {
        didConnectRef.current = true;
        const { nodes, addEdge, updateNodeAndPersist } = useGraphStore.getState();
        const sourceNode = nodes.find(n => n.id === params.source);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let edgeParams: any = { ...params };

        if (sourceNode?.type === 'comment') {
            edgeParams = {
                ...params,
                style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
                animated: true,
            };
            if (params.target) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updateNodeAndPersist(params.target, { hasInstruction: true } as any);
                updateNodeAndPersist(params.source!, { parentId: params.target, data: { ...sourceNode.data, parentId: params.target } });
            }
        }

        addEdge({
            ...edgeParams,
            id: `e${params.source}-${params.sourceHandle || ''}-${params.target}-${params.targetHandle || ''}`,
        } as FlowEdge);
    }, [didConnectRef]);

    // ── Node drag-stop (group auto-parenting) ────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onNodeDragStop = useCallback((_event: React.MouseEvent, node: any) => {
        if (node.type === 'group') return;
        const { nodes: allNodes, updateNodeFull: updateFull, updateNodeAndPersist: persistUpdate } = useGraphStore.getState();
        const groupNodes = allNodes.filter(n => n.type === 'group');

        let finalParentId = node.parentId;
        let finalPosition = node.position;

        for (const group of groupNodes) {
            if (group.id === node.id) continue;
            const gw = group.style?.width as number || 200;
            const gh = group.style?.height as number || 100;
            const inside =
                node.position.x >= group.position.x &&
                node.position.x <= group.position.x + gw &&
                node.position.y >= group.position.y &&
                node.position.y <= group.position.y + gh;

            if (inside) {
                finalParentId = group.id;
                finalPosition = {
                    x: node.position.x - group.position.x,
                    y: node.position.y - group.position.y,
                };
                if (node.parentId !== group.id) {
                    updateFull(node.id, { parentId: finalParentId, position: finalPosition });
                }
                break;
            } else if (node.parentId === group.id) {
                finalParentId = undefined;
                finalPosition = {
                    x: node.position.x + group.position.x,
                    y: node.position.y + group.position.y,
                };
                updateFull(node.id, { parentId: finalParentId, position: finalPosition });
            }
        }

        persistUpdate(node.id, { position: finalPosition, parentId: finalParentId, style: node.style });
    }, []); // reads fresh state via getState()

    // ── Node click ───────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
        // Always call selectNode — nodeClickTs bumps even for same-node re-clicks,
        // so BrowserView's useEffect re-runs and switches to the correct tab.
        selectNode(node.id);
    }, [selectNode]);

    // ── Pane click ───────────────────────────────────────────────────────────
    const onPaneClick = useCallback(() => {
        selectNode(null);
        setContextMenu(p => ({ ...p, visible: false }));
        setPaneContextMenu(p => ({ ...p, visible: false }));
        setEdgeContextMenu(p => ({ ...p, visible: false }));
        onPaneClickProp?.();
    }, [selectNode, setContextMenu, setPaneContextMenu, setEdgeContextMenu, onPaneClickProp]);

    // ── Edge style defaults ──────────────────────────────────────────────────
    const deleteKeyCode = useMemo(() => ['Backspace', 'Delete'], []);
    const defaultEdgeOptions = useMemo(() => ({
        type: 'simplebezier',
        style: { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: 'none' },
        markerEnd: { type: MarkerType.Arrow, color: '#9ca3af' },
        animated: false,
    }), []);

    const isEmpty = nodes.length === 0;

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div
            className="w-full h-full bg-neutral-950 relative"
            onDragOver={onDragOver}
            onDrop={onDropReal}
        >
            <CanvasOverlay nodeCount={nodes.length} />
            {isEmpty && <EmptyGraphState />}
            <WhiteboardSelector />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onReconnect={onReconnect}
                edgesUpdatable={!readOnly}
                onReconnectStart={onReconnectStart}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={(_, node) => onNodeOpen?.(node.id)}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneClick={onPaneClick}
                onPaneContextMenu={onPaneContextMenu}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={useMemo(() => nodeTypes, [])}
                edgeTypes={useMemo(() => edgeTypes, [])}
                defaultEdgeOptions={defaultEdgeOptions}
                selectionMode={SelectionMode.Partial}
                selectionOnDrag
                panOnScroll
                panOnDrag={[1, 2]}
                selectNodesOnDrag
                fitView
                snapToGrid={snapToGrid}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elementsSelectable={!readOnly}
                edgesFocusable={!readOnly}
                deleteKeyCode={deleteKeyCode}
                connectionMode={ConnectionMode.Loose}
                connectionLineStyle={useMemo(() => ({
                    stroke: '#9ca3af',
                    strokeWidth: 2,
                    strokeDasharray: 'none',
                    opacity: connectionDropMenu.visible ? 0 : 1,
                }), [connectionDropMenu.visible])}
                className={`bg-neutral-950 ${readOnly ? 'cursor-not-allowed' : ''}`}
            >
                <Background color="#1a1a1a" gap={20} size={2} />

                {!isEmpty && (
                    <MiniMap
                        className="bg-neutral-900! border-neutral-800!"
                        maskColor="rgba(0,0,0,0.8)"
                        nodeColor={(node) => {
                            switch (node.type) {
                                case 'synthesis': return '#22c55e';
                                case 'video': return '#ef4444';
                                case 'code': return '#f97316';
                                case 'product': return '#a855f7';
                                case 'academic': return '#3b82f6';
                                case 'ghost': return '#6b7280';
                                case 'note': return '#eab308';
                                default: return '#22c55e';
                            }
                        }}
                    />
                )}

                <GraphControls
                    onSynthesis={handleSynthesis}
                    onASTEditor={handleOpenASTEditor}
                    onAddNote={handleAddNote}
                    onAddGroup={handleAddGroup}
                    onAddText={handleAddText}
                    onTemplate={() => setShowTemplateModal(true)}
                    onFitSelection={onFitSelection}
                    onImportCanvas={() => setShowImportModal(true)}
                />
            </ReactFlow>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            <ASTEditorModal
                isOpen={showASTEditor}
                onClose={() => setShowASTEditor(false)}
                initialAST={initialAST || undefined}
                onCompile={handleCompileAST}
            />

            <ResearchPdfModal
                isOpen={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                pdfUrl={pdfUrl}
                isLoading={isSynthesizing}
                stage={synthesisStage}
                message={synthesisMessage}
                onOpenAdvancedEditor={handleOpenAdvancedEditor}
                error={synthesisError}
            />

            <WebUrlModal
                isOpen={showWebUrlModal}
                onClose={() => setShowWebUrlModal(false)}
                onSubmit={handleWebUrlSubmit}
            />

            {showImportModal && (
                <CanvasImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={(targetId, targetName) => {
                        const nodeId = `canvas-${Date.now()}`;
                        const { flowPos } = paneContextMenu;
                        const newNode = {
                            id: nodeId, type: 'canvas',
                            position: flowPos || { x: 0, y: 0 },
                            data: { title: targetName, referencedCanvasId: targetId, whiteboard_id: activeWhiteboardId },
                        };
                        addNode(newNode);
                        nodesApi.create({ ...newNode, type: 'canvas', title: targetName, data: { ...newNode.data } });
                        setShowImportModal(false);
                    }}
                />
            )}

            {showTemplateModal && (
                <TemplateModal
                    onClose={() => setShowTemplateModal(false)}
                    onSelect={handleTemplateSelect}
                />
            )}

            {showSynthesis && <SynthesisModal onClose={() => setShowSynthesis(false)} />}

            {/* ── Context Menus ──────────────────────────────────────────── */}
            {contextMenu.visible && (
                <ContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={() => setContextMenu(p => ({ ...p, visible: false }))}
                    actions={contextActions}
                />
            )}

            {paneContextMenu.visible && (
                <ContextMenu
                    position={{ x: paneContextMenu.x, y: paneContextMenu.y }}
                    onClose={() => setPaneContextMenu(p => ({ ...p, visible: false }))}
                    actions={paneActions}
                />
            )}

            {edgeContextMenu.visible && (
                <ContextMenu
                    position={{ x: edgeContextMenu.x, y: edgeContextMenu.y }}
                    onClose={() => setEdgeContextMenu(p => ({ ...p, visible: false }))}
                    actions={edgeActions}
                />
            )}

            {/* ── Connection drop menu (Obsidian-style) ──────────────────── */}
            <ConnectionDropMenu
                menu={connectionDropMenu}
                onAction={handleConnectionDropAction}
                onClose={closeConnectionDropMenu}
            />
        </div>
    );
}

// ─── Public export (wraps with ReactFlowProvider) ─────────────────────────────
export default function CanvasView(props: CanvasViewProps) {
    return (
        <ReactFlowProvider>
            <CanvasViewInner {...props} />
        </ReactFlowProvider>
    );
}
