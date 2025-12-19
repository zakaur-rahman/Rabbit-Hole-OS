import { create } from 'zustand';
import { 
    Connection, 
    Edge, 
    EdgeChange, 
    Node, 
    NodeChange, 
    addEdge as addFlowEdge, 
    applyNodeChanges, 
    applyEdgeChanges,
    MarkerType, // Import MarkerType
} from 'reactflow';
import { nodesApi, edgesApi } from '@/lib/api';

export interface Whiteboard {
  id: string;
  name: string;
}

export interface BrowserState {
  url: string;
  displayInput: string;
}

export interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  activeWhiteboardId: string;
  whiteboards: Whiteboard[];
  browserStates: Record<string, BrowserState>;

  initialize: () => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setWhiteboard: (id: string) => Promise<void>;
  fetchNodes: () => Promise<void>;
  addNode: (node: Node) => Promise<void>;
  addEdge: (edge: Edge) => Promise<void>;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => Promise<void>;
  updateNode: (id: string, data: Partial<any>) => void;
  updateNodeFull: (id: string, updates: Partial<any>) => void;
  updateNodeData: (id: string, updater: (prevData: any) => any) => void;
  updateWhiteboard: (id: string, name: string) => void;
  removeWhiteboard: (id: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectNode: (id: string | null) => void;
  syncLinks: (sourceId: string, content: string) => void;
  getSelectedNodes: () => Node[];
  clearGraph: () => void;
  updateBrowserState: (whiteboardId: string, state: Partial<BrowserState>) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeWhiteboardId: 'main',
  whiteboards: [{ id: 'main', name: 'Main Brain' }],
  browserStates: {
      'main': { url: '', displayInput: '' }
  },

  updateBrowserState: (whiteboardId: string, state: Partial<BrowserState>) => set((s) => ({
      browserStates: {
          ...s.browserStates,
          [whiteboardId]: {
              ...(s.browserStates[whiteboardId] || { url: '', displayInput: '' }),
              ...state
          }
      }
  })),

  initialize: () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('whiteboards');
        if (stored) {
            try {
                set({ whiteboards: JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse whiteboards from localStorage", e);
            }
        }
    }
  },

  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => {
    // Remove duplicates and enforce Obsidian style
    const uniqueEdges = edges.filter((edge, index, self) => 
      index === self.findIndex(e => e.id === edge.id)
    ).map(edge => ({
        ...edge,
        type: 'simplebezier',
        animated: false,
        style: { stroke: '#9ca3af', strokeWidth: 2 },
        markerEnd: {
            type: MarkerType.Arrow,
            color: '#9ca3af',
        },
    }));
    set({ edges: uniqueEdges });
  },

  setWhiteboard: async (id: string) => {
    set({ activeWhiteboardId: id });
    
    // Save whiteboard list if it's new
    const { whiteboards } = get();
    if (typeof window !== 'undefined') {
        localStorage.setItem('whiteboards', JSON.stringify(whiteboards));
    }
    
    console.log(`[Store] Fetching data for whiteboard: ${id}`);
    try {
        const [apiNodes, apiEdges] = await Promise.all([
            nodesApi.list(id),
            edgesApi.list(id) // Fetch edges
        ]);
        
        // Transform ApiNodes to ReactFlow Nodes
        const flowNodes = apiNodes.map(n => ({
            id: n.id,
            type: n.type || 'article', // Default type
            position: n.metadata?.position || { x: Math.random() * 500, y: Math.random() * 500 },
            data: { 
                title: n.title,
                url: n.url,
                content: n.content,
                ...n.metadata 
            },
            style: n.metadata?.style,
            parentId: n.metadata?.parentId,
        }));
        set({ nodes: flowNodes, edges: apiEdges || [] });
    } catch(e) {
        console.error("Failed to set whiteboard", e);
    }
  },

  fetchNodes: async () => {
      const { activeWhiteboardId } = get();
      try {
          const [apiNodes, apiEdges] = await Promise.all([
              nodesApi.list(activeWhiteboardId),
              edgesApi.list(activeWhiteboardId)
          ]);

          const flowNodes = apiNodes.map(n => ({
            id: n.id,
            type: n.type || 'article',
            position: n.metadata?.position || { x: Math.random() * 500, y: Math.random() * 500 },
            data: { 
                title: n.title,
                url: n.url,
                content: n.content,
                label: n.metadata?.label, // For group nodes
                text: n.metadata?.text,   // For text nodes
                ...n.metadata 
            },
            style: n.metadata?.style, // For group size
            parentId: n.metadata?.parentId,
        }));

        set({ nodes: flowNodes, edges: apiEdges || [] });
      } catch (e) {
          console.error("[Store] Failed to fetchNodes", e);
      }
  },

  addNode: async (node: Node) => {
    const { activeWhiteboardId } = get();
    const nodeWithWb = {
        ...node,
        data: {
            ...node.data,
            whiteboard_id: activeWhiteboardId
        }
    };

    set((state) => ({ 
      nodes: [...state.nodes, nodeWithWb] 
    }));

    try {
        await nodesApi.create({
            id: node.id,
            type: node.type || 'article',
            title: node.data.title,
            url: node.data.url,
            data: nodeWithWb.data
        });
    } catch(e) {
        console.error("Failed to persist node", e);
    }
  },
  
  addEdge: async (edge: Edge) => {
    const { activeWhiteboardId, edges } = get();
    
    // Check if edge already exists
    const edgeExists = edges.some(e => e.id === edge.id);
    if (edgeExists) {
      console.log('Edge already exists:', edge.id);
      return;
    }
    
    // Force consistent Obsidian-style edge properties
    const styledEdge = {
        ...edge,
        type: 'simplebezier',
        animated: false,
        style: { stroke: '#9ca3af', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.Arrow,
          color: '#9ca3af',
        },
    };

    // Optimistic update
    set((state) => ({ 
        edges: [...state.edges, styledEdge] 
    }));
    try {
        await edgesApi.create(edge, activeWhiteboardId);
    } catch(e) {
        console.error("Failed to persist edge", e);
        // data consistency? revert?
    }
  },

  removeNode: (id: string) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
  })),

  removeEdge: async (id: string) => {
    const { activeWhiteboardId, edges } = get();
    
    // Check if the edge exists locally before trying to delete
    const exists = edges.some(e => e.id === id);
    if (!exists) return;

    set((state) => ({
      edges: state.edges.filter(e => e.id !== id),
    }));

    try {
        await edgesApi.delete(id, activeWhiteboardId);
    } catch(e: any) {
        // Silently handle 404s as they can occur during rapid reconnections
        if (!e.message?.includes('404')) {
            console.error("Failed to delete edge", e);
        }
    }
  },

  updateNode: (id: string, data: Partial<any>) => set((state) => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, data: { ...n.data, ...data } } : n
    ),
  })),

  updateNodeFull: (id: string, updates: Partial<any>) => set((state) => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, ...updates } : n
    ),
  })),

  updateNodeData: (id: string, updater: (prevData: any) => any) => set((state) => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, data: updater(n.data) } : n
    ),
  })),

  updateWhiteboard: (id: string, name: string) => set((state) => ({
    whiteboards: state.whiteboards.map(wb => 
      wb.id === id ? { ...wb, name } : wb
    ),
  })),

  removeWhiteboard: (id: string) => {
      const { activeWhiteboardId, whiteboards } = get();
      if (id === 'main') return; // Cannot delete main

      const newWhiteboards = whiteboards.filter(wb => wb.id !== id);
      set({ whiteboards: newWhiteboards });

      if (activeWhiteboardId === id) {
          get().setWhiteboard('main');
      }
  },

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    const { activeWhiteboardId } = get();
    
    // Handle deletions
    changes.forEach(change => {
        if (change.type === 'remove') {
            const exists = get().edges.some(e => e.id === change.id);
            if (exists) {
                edgesApi.delete(change.id, activeWhiteboardId).catch(err => {
                    if (!err.message?.includes('404')) {
                        console.error("Failed to delete edge in onEdgesChange", err);
                    }
                });
            }
        }
    });

    const newEdges = applyEdgeChanges(changes, get().edges);
    
    // Remove duplicates by edge id
    const uniqueEdges = newEdges.filter((edge, index, self) => 
      index === self.findIndex(e => e.id === edge.id)
    );
    
    set({ edges: uniqueEdges });
  },

  selectNode: (id: string | null) => set({ selectedNodeId: id }),

  // Parse content for bidirectional links [[...]] and tags #...
  syncLinks: (sourceId: string, content: string) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    // 1. Extract links [[Title]]
    const linkRegex = /\[\[(.*?)\]\]/g;
    const links = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    // 2. Extract tags #tag
    const tagRegex = /#(\w+)/g;
    const tags = [];
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }

    // Update tags
    if (tags.length > 0) {
       get().updateNode(sourceId, { tags });
    }

    // 3. Create edges for existing nodes
    const newEdges = [...edges];
    let edgesChanged = false;

    links.forEach(linkTitle => {
      // Find target node by title (case insensitive)
      const targetNode = nodes.find(n => 
        n.data.title?.toLowerCase() === linkTitle.toLowerCase() && n.id !== sourceId
      );

      if (targetNode) {
        // Check if edge exists
        const edgeExists = edges.some(e => 
          (e.source === sourceId && e.target === targetNode.id) ||
          (e.source === targetNode.id && e.target === sourceId)
        );

        if (!edgeExists) {
          newEdges.push({
            id: `e-${sourceId}-${targetNode.id}`,
            source: sourceId,
            sourceHandle: 'bottom',
            target: targetNode.id,
            targetHandle: 'top',
            animated: true,
            style: { stroke: '#eab308', strokeWidth: 2 } // Yellow for manual links
          });
          edgesChanged = true;
        }
      }
    });

    if (edgesChanged) {
      set({ edges: newEdges });
    }
  },

  getSelectedNodes: () => {
    const { nodes, selectedNodeId } = get();
    if (!selectedNodeId) return [];
    return nodes.filter(n => n.id === selectedNodeId);
  },

  clearGraph: () => set({ nodes: [], edges: [], selectedNodeId: null }),
}));
