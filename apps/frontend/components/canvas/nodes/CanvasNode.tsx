'use client';

import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Background, ConnectionMode, useReactFlow } from 'reactflow';
import { NodeProps } from 'reactflow';
import { Layout, ArrowRightCircle, Network } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { nodesApi, edgesApi, ApiNode } from '@/lib/api';
import BaseNode from './BaseNode';
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
        <div className={`w-full h-full bg-${accentColor}/10 border border-${accentColor}/30 rounded-lg flex items-center justify-center min-h-[30px]`}>
            <Network size={12} className={`${iconColor} opacity-40`} />
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
};

function CanvasPreview({ nodes, edges, loading, width, height, accentColor = 'indigo-500' }: { nodes: any[], edges: any[], loading: boolean, width?: number, height?: number, accentColor?: string }) {
    const { fitView } = useReactFlow();
    const iconColor = `text-${accentColor.replace('500', '400')}`;

    // Re-fit view when nodes or dimensions change
    useEffect(() => {
        if (nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ padding: 0.15, duration: 450, includeHiddenNodes: false });
            }, 60); // Faster trigger, less padding for more "looking glass" feel
            return () => clearTimeout(timer);
        }
    }, [nodes.length, fitView, width, height]); // Only track length of nodes to avoid circular refits

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
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            connectionMode={ConnectionMode.Loose}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
            style={{ width: '100%', height: '100%' }}
        >
            <Background color="#111" gap={20} size={1} />
        </ReactFlow>
    );
}

function CanvasNode({ data, selected, id, ...props }: NodeProps<CanvasNodeData>) {
    const initialDims = props as any;
    const { setWhiteboard } = useGraphStore();
    const [childNodes, setChildNodes] = useState<ApiNode[]>([]);
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
    const handleResize = useCallback((_: any, params: { width: number; height: number }) => {
        setDims({ width: params.width, height: params.height });
    }, []);

    // Subscribe to node data for color updates
    const nodeData = useGraphStore((state) => state.nodes.find((n) => n.id === id)?.data);
    const effectiveAccentColor = nodeData?.color || 'indigo-500';
    const effectiveIconColor = `text-${effectiveAccentColor.replace('500', '400')}`;

    useEffect(() => {
        if (data.referencedCanvasId) {
            setLoading(true);
            Promise.all([
                nodesApi.list(data.referencedCanvasId),
                edgesApi.list(data.referencedCanvasId)
            ]).then(([nodes, edges]) => {
                setChildNodes(nodes);
                setChildEdges(edges);
            })
                .catch(console.error)
                .finally(() => setLoading(false));
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
                color: node.metadata?.color || node.data?.color, // Ensure color is passed down
                isPreview: true // Flag to tell nodes they are in preview mode
            },
            style: node.metadata?.style || { width: 300, height: 200 }
        }));
    }, [childNodes]);

    const flowEdges = useMemo(() => {
        return childEdges.map(edge => ({
            ...edge,
            id: `preview-${edge.id}`,
            source: `preview-${edge.source}`,
            target: `preview-${edge.target}`,
        }));
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
            title={data.title || 'Untitled Canvas'}
            subtitle={subtitle}
            icon={Layout}
            iconColor={effectiveIconColor}
            accentColor={effectiveAccentColor}
            minWidth={480}
            minHeight={420}
            onResize={handleResize}
            headerRight={
                <button
                    onClick={handleEnter}
                    className={`flex items-center gap-1.5 px-3 py-1.5 bg-${effectiveAccentColor}/10 border border-${effectiveAccentColor}/20 hover:bg-${effectiveAccentColor}/20 rounded-lg ${effectiveIconColor} text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group shadow-lg shadow-${effectiveAccentColor}/5`}
                >
                    <span>Open</span>
                    <ArrowRightCircle size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            }
        >
            <div className="flex-1 p-2 flex flex-col gap-4 hover:bg-neutral-950/95 nodrag overflow-hidden">
                {/* Internal ReactFlow View */}
                <div className={`flex-1 bg-neutral-950/95 rounded-2xl border-[1px] border-${effectiveAccentColor}/30 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(var(--accent-rgb),0.05)] ring-1 ring-white/10 min-h-[280px]`}>
                    <div className="absolute inset-0 pointer-events-none z-0">
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
                    <div className={`absolute inset-0 bg-gradient-to-tr from-${effectiveAccentColor}/[0.08] via-transparent to-transparent pointer-events-none z-10`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none z-10" />
                    <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none z-10" />

                    {/* Glass Reflection */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none z-10" />
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(CanvasNode);
