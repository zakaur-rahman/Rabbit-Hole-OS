import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Trash2, FileText, Code, ShoppingBag, BookOpen, Video, StickyNote } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { Node, Edge } from 'reactflow';
import { ApiNode, nodesApi } from '@/lib/api';

interface NodeDetailsPanelProps {
    nodeIds: string[];
    activeNodeId: string | null;
    onClose: (id: string) => void;
    onActivate: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
    article: <FileText size={16} className="text-green-400" />,
    code: <Code size={16} className="text-orange-400" />,
    product: <ShoppingBag size={16} className="text-purple-400" />,
    academic: <BookOpen size={16} className="text-blue-400" />,
    video: <Video size={16} className="text-red-400" />,
    note: <StickyNote size={16} className="text-yellow-400" />,
};

export default function NodeDetailsPanel({ nodeIds, activeNodeId, onClose, onActivate }: NodeDetailsPanelProps) {
    const { nodes, setNodes, edges, setEdges, selectNode } = useGraphStore();
    const [relatedNodes, setRelatedNodes] = useState<ApiNode[]>([]);
    const [loading, setLoading] = useState(false);

    const activeNode = nodes.find(n => n.id === activeNodeId) || nodes.find(n => n.id === nodeIds[0]);

    useEffect(() => {
        if (activeNodeId) {
            fetchRelated(activeNodeId);
        }
    }, [activeNodeId]);

    const fetchRelated = async (id: string) => {
        try {
            const related = await nodesApi.getRelated(id);
            setRelatedNodes(related);
        } catch (e: unknown) {
            if (e instanceof Error && e.message?.includes('404')) {
                setRelatedNodes([]);
                return;
            }
            console.error('Error fetching related nodes:', e);
        }
    };

    const handleDelete = async () => {
        if (!activeNodeId) return;
        setLoading(true);
        try {
            await nodesApi.delete(activeNodeId);
            setNodes(nodes.filter((n: Node) => n.id !== activeNodeId));
            setEdges(edges.filter((e: Edge) => e.source !== activeNodeId && e.target !== activeNodeId));
            onClose(activeNodeId);
        } catch (e) {
            console.error('Error deleting node:', e);
        } finally {
            setLoading(false);
        }
    };

    if (!activeNode || nodeIds.length === 0) return null;

    const data = activeNode.data || {};

    const openExternal = () => {
        if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="absolute top-0 left-0 bottom-0 right-0 bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-800 flex flex-col pointer-events-auto">
            {/* Tabs Header */}
            <div className="flex items-center overflow-x-auto border-b border-neutral-800 bg-neutral-950/50 scrollbar-hide">
                {nodeIds.map(id => {
                    const n = nodes.find(x => x.id === id);
                    if (!n) return null;
                    const isActive = id === activeNodeId;
                    return (
                        <div
                            key={id}
                            onClick={() => onActivate(id)}
                            className={`flex items-center gap-2 px-3 py-2.5 min-w-[120px] max-w-[200px] border-r border-neutral-800 cursor-pointer group transition-colors ${isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-900/50 text-neutral-500'
                                }`}
                        >
                            <span className="shrink-0">{(n.type && typeIcons[n.type]) || <FileText size={14} />}</span>
                            <span className={`text-xs truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
                                {n.data.title || 'Untitled'}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(id); }}
                                className={`p-0.5 rounded-md hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Content for Active Node */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Header Info */}
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                            {activeNode.type}
                        </span>
                        <h3 className="text-lg font-semibold text-white leading-tight mt-1">
                            {data.title || 'Untitled'}
                        </h3>
                    </div>
                </div>

                {/* URL */}
                {data.url && (
                    <button
                        onClick={openExternal}
                        className="w-full flex items-center gap-2 p-2 bg-neutral-800/50 border border-neutral-800 hover:border-green-500/50 rounded-lg group transition-all"
                    >
                        <ExternalLink size={14} className="text-green-500" />
                        <span className="text-xs text-neutral-400 group-hover:text-white truncate">
                            {new URL(data.url).hostname}
                        </span>
                    </button>
                )}

                {/* Snippet/Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                    {data.content ? (
                        <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            {data.content.slice(0, 1000)}
                            {data.content.length > 1000 && <span className="text-neutral-500">...</span>}
                        </div>
                    ) : (
                        <div className="text-sm text-neutral-500 italic">No content</div>
                    )}
                </div>

                {/* Tags */}
                {data.tags && data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {data.tags.map((tag: string) => (
                            <span key={tag} className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Related & Links Sections (Simplified for brevity, can re-add full logic) */}
                <div className="pt-4 border-t border-neutral-800 space-y-4">
                    {/* Related Nodes */}
                    {relatedNodes.length > 0 && (
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
                                Related ({relatedNodes.length})
                            </label>
                            <div className="space-y-1">
                                {relatedNodes.map((related: { id: string; title: string }) => (
                                    <button
                                        key={related.id}
                                        onClick={() => selectNode(related.id)}
                                        className="w-full text-left p-2 hover:bg-neutral-800 rounded text-xs text-neutral-300 truncate transition-colors"
                                    >
                                        {related.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-neutral-800 grid grid-cols-3 gap-2">
                {data.url ? (
                    <button
                        onClick={openExternal}
                        className="col-span-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={14} />
                        Open URL
                    </button>
                ) : (
                    <button
                        onClick={() => alert('Editing content coming soon')}
                        className="col-span-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-2"
                    >
                        Copy Info
                    </button>
                )}
                <button
                    onClick={() => {
                        if (window.confirm('Delete this node from the graph?')) {
                            handleDelete();
                        }
                    }}
                    disabled={loading}
                    className="py-1.5 px-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                    title="Delete Node"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

