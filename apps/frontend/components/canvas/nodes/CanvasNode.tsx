'use client';

import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Background, ConnectionMode, MarkerType, Handle, Position } from 'reactflow';
import { NodeProps } from 'reactflow';
import { Layout, ArrowRightCircle, Network } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi, edgesApi, ApiNode } from '@/lib/api';
import BaseNode from './BaseNode';
import { useNodeTheme } from '@/hooks/useNodeTheme';
import 'reactflow/dist/style.css';

// Import all node types for internal rendering
import ArticleNode from './ArticleNode';
import NoteNode from './NoteNode';
import CodeNode from './CodeNode';
import VideoNode from './VideoNode';
import ProductNode from './ProductNode';
import AcademicNode from './AcademicNode';
import GhostNode from './GhostNode';
import GroupNode from './GroupNode';
import TextNode from './TextNode';
import AnnotationNode from './AnnotationNode';
import SynthesisNode from './SynthesisNode';

export interface CanvasNodeData {
    title: string;
    referencedCanvasId: string;
    nodeCount?: number;
}

const MiniCanvasNode = ({ data }: { data?: { color?: string } }) => {
    const accentColor = data?.color || 'indigo-500';
    const iconColor = `text-${accentColor.replace('500', '400')}`;
    return (
        <div className={`w-full h-full bg-${accentColor}/10 border border-${accentColor}/30 rounded-lg flex items-center justify-center min-h-[30px] relative`}>
            <Network size={12} className={`${iconColor} opacity-40`} />

            {/* Standard Handles for nested connectivity in preview */}
            <Handle type="target" position={Position.Top} id="top" className="opacity-0!" />
            <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0!" />
            <Handle type="target" position={Position.Left} id="left" className="opacity-0!" />
            <Handle type="source" position={Position.Right} id="right" className="opacity-0!" />
        </div>
    );
};

const internalNodeTypes = {
    article: ArticleNode,
    note: NoteNode,
    code: CodeNode,
    video: VideoNode,
    product: ProductNode,
    academic: AcademicNode,
    ghost: GhostNode,
    group: GroupNode,
    text: TextNode,
    annotation: AnnotationNode,
    synthesis: SynthesisNode,
    canvas: MiniCanvasNode,
    default: NoteNode // Fallback
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CanvasPreview({ nodes, edges, loading, width, height, accentColor = 'indigo-500' }: { nodes: any[], edges: any[], loading: boolean, width?: number, height?: number, accentColor?: string }) {
    const iconColor = `text-${accentColor.replace('500', '400')}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactFlowInstance = React.useRef<any>(null);

    // Re-fit view when nodes or dimensions change
    useEffect(() => {
        if (nodes.length > 0 && reactFlowInstance.current) {
            const timer = setTimeout(() => {
                reactFlowInstance.current.fitView({ padding: 0.15, duration: 200 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [nodes.length, width, height]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInit = useCallback((instance: any) => {
        reactFlowInstance.current = instance;
        // Initial fit with a slight delay
        setTimeout(() => {
            instance.fitView({ padding: 0.15 });
        }, 50);
    }, []);

    if (loading) {
        return (
            <div className={`h-full flex flex-col items-center justify-center p-8 opacity-40 italic text-[11px] ${iconColor}/60 gap-3`}>
                <div className="relative">
                    <Network size={32} className="opacity-20 animate-pulse" />
                    <div className={`absolute inset-0 bg-${accentColor}/20 blur-xl animate-pulse`} />
                </div>
                <span className="font-bold tracking-widest uppercase text-[9px]">Synchronizing...</span>
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 opacity-30 italic text-[11px] text-neutral-500 gap-3">
                <Layout size={32} className="opacity-20 translate-y-1" />
                <span className="font-medium">No nested nodes found</span>
            </div>
        );
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={internalNodeTypes}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            connectionMode={ConnectionMode.Loose}
            onInit={onInit}
            defaultEdgeOptions={{
                type: 'simplebezier',
                animated: false,
                style: { stroke: '#9ca3af', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: '#9ca3af',
                },
            }}
            style={{ width: '100%', height: '100%' }}
        >
            <Background color="#111" gap={20} size={1} />
        </ReactFlow>
    );
}

function CanvasNode({ data, selected, id, ...props }: NodeProps<CanvasNodeData>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialDims = props as any;
    const { setWhiteboard } = useGraphStore();
    const [childNodes, setChildNodes] = useState<ApiNode[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [childEdges, setChildEdges] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Properly initialize from style metadata or default props
    const [dims, setDims] = useState(() => {
        const style = initialDims.data?.style || initialDims.style;
        return {
            width: style?.width || initialDims.width || 480,
            height: style?.height || initialDims.height || 420
        };
    });

    // Handle real-time resize to trigger fitView
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleResize = useCallback((_: any, params: { width: number; height: number }) => {
        setDims({ width: params.width, height: params.height });
    }, []);

    // Subscribe to node data for color updates
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const effectiveAccentColor = nodeData?.color || 'indigo';
    const { theme } = useNodeTheme(effectiveAccentColor);
    const [title, setTitle] = useState(data.title || '');
    const updateNodeAndPersist = useGraphStore(state => state.updateNodeAndPersist);

    // Debounced title sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== data.title) {
                updateNodeAndPersist(id, {
                    data: { ...data, title }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [title, id, updateNodeAndPersist, data]);

    useEffect(() => {
        if (data.referencedCanvasId) {
            const timeout = setTimeout(() => {
                setLoading(true);
            }, 0);
            Promise.all([
                nodesApi.list(data.referencedCanvasId),
                edgesApi.list(data.referencedCanvasId)
            ]).then(([nodes, edges]) => {
                setChildNodes(nodes);
                setChildEdges(edges);
            })
                .catch(console.error)
                .finally(() => setLoading(false));
            return () => clearTimeout(timeout);
        }
    }, [data.referencedCanvasId]);

    // Map API nodes to ReactFlow nodes
    const flowNodes = useMemo(() => {
        return childNodes.map(node => ({
            id: `preview-${node.id}`, // Unique ID for preview to avoid store collisions
            type: node.type,
            position: node.metadata?.position || { x: 0, y: 0 },
            data: {
                ...node.data,
                ...node.metadata,
                title: node.title,
                snippet: node.snippet,
                content: node.content,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                color: (node.metadata as any)?.color || (node.data as any)?.color, // Ensure color is passed down
                isPreview: true // Flag to tell nodes they are in preview mode
            },
            style: node.metadata?.style || { width: 300, height: 200 }
        }));
    }, [childNodes]);

    const flowEdges = useMemo(() => {
        return childEdges.map(edge => {
            const sourceHandle = edge.sourceHandle || edge.source_handle || '';
            const targetHandle = edge.targetHandle || edge.target_handle || '';

            // Map common handle patterns to our standard ones
            const mapHandle = (h: string, isSource: boolean) => {
                if (h.includes('top')) return 'top';
                if (h.includes('bottom')) return 'bottom';
                if (h.includes('left')) return 'left';
                if (h.includes('right')) return 'right';
                return isSource ? 'bottom' : 'top';
            };

            return {
                id: `preview-${edge.id}`,
                source: `preview-${edge.source}`,
                target: `preview-${edge.target}`,
                sourceHandle: mapHandle(sourceHandle, true),
                targetHandle: mapHandle(targetHandle, false),
                type: 'simplebezier',
                animated: false,
                style: { stroke: '#9ca3af', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: '#9ca3af',
                },
            };
        });
    }, [childEdges]);

    const handleEnter = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.referencedCanvasId) {
            setWhiteboard(data.referencedCanvasId);
        }
    };

    const subtitle = loading ? 'SCANNING...' : `${childNodes.length} NODES • ${childEdges.length} EDGES`;

    return (
        <BaseNode
            id={id}
            selected={selected}
            title={title}
            onTitleChange={setTitle}
            subtitle={subtitle}
            icon={Layout}
            accentColor={effectiveAccentColor}
            minWidth={480}
            minHeight={420}
            onResize={handleResize}
            headerRight={
                <button
                    onClick={handleEnter}
                    className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group shadow-lg"
                    style={{
                        backgroundColor: `${theme.primary}1a`,
                        borderColor: `${theme.primary}33`,
                        color: theme.accent,
                        boxShadow: `0 10px 15px -3px ${theme.primary}0d`,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.primary}33`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.primary}1a`;
                    }}
                >
                    <span>Open</span>
                    <ArrowRightCircle size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            }
        >
            <div className="flex-1 p-2 flex flex-col gap-4  nodrag overflow-hidden">
                {/* Internal ReactFlow View */}
                <div
                    className="flex-1 bg-neutral-950/95 rounded-2xl border relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 min-h-[280px]"
                    style={{ borderColor: theme.border }}
                >
                    <div className="absolute inset-0 z-0">
                        <ReactFlowProvider>
                            <CanvasPreview
                                nodes={flowNodes}
                                edges={flowEdges}
                                loading={loading}
                                width={dims.width}
                                height={dims.height}
                                accentColor={effectiveAccentColor}
                            />
                        </ReactFlowProvider>
                    </div>

                    {/* Vignette Overlay for Depth */}
                    <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{ background: `linear-gradient(to top right, ${theme.primary}0a, transparent, transparent)` }}
                    />

                    {/* Glass Reflection */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-linear-to-b from-white/3 to-transparent pointer-events-none z-10" />
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(CanvasNode);
