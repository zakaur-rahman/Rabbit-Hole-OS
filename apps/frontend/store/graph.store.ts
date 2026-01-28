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
import { localStorage as storage, isElectron } from '@/lib/local-storage';
import { nodesApi, edgesApi, whiteboardsApi } from '@/lib/api';

export interface Whiteboard {
  id: string;
  name: string;
  synced_at?: number | null;
  updated_at?: number;
}

export interface Tab {
  id: string;
  url: string;
  displayInput: string;
  title: string;
  isLoading?: boolean;
  lastNodeId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export interface BrowserState {
  url: string;
  displayInput: string;
  tabs: Tab[];
  activeTabId: string;
  isAutoSyncEnabled: boolean;
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
  addNode: (node: Node, persist?: boolean) => Promise<void>;
  addEdge: (edge: Edge) => Promise<void>;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => Promise<void>;
  updateNode: (id: string, data: Partial<any>) => void;
  updateNodeFull: (id: string, updates: Partial<any>) => void;
  updateNodeData: (id: string, updater: (prevData: any) => any) => void;
  updateWhiteboard: (id: string, name: string) => void;
  createWhiteboard: (name?: string) => Promise<string>;
  removeWhiteboard: (id: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectNode: (id: string | null) => void;
  syncLinks: (sourceId: string, content: string) => void;
  getSelectedNodes: () => Node[];
  clearGraph: () => void;
  updateBrowserState: (whiteboardId: string, state: Partial<BrowserState>) => void;
  updateNodeAndPersist: (id: string, updates: Partial<any>) => Promise<void>;
  authModalState: { isOpen: boolean; message: string };
  setAuthModal: (isOpen: boolean, message?: string) => void;
  fetchWhiteboards: () => Promise<void>;
  openWhiteboardIds: string[];
  closeWhiteboard: (id: string) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeWhiteboardId: 'main',
  whiteboards: [{ id: 'main', name: 'Main Brain' }],
  browserStates: {
      'main': { 
          url: '', 
          displayInput: '',
          tabs: [{ id: '1', url: '', displayInput: '', title: 'New Tab' }],
          activeTabId: '1',
          isAutoSyncEnabled: false
      }
  },
  authModalState: { isOpen: false, message: '' },
  setAuthModal: (isOpen: boolean, message = '') => set({ authModalState: { isOpen, message } }),
  openWhiteboardIds: ['main'],

  closeWhiteboard: (id: string) => {
      if (id === 'main') return; // Cannot close main tab for now (optional design choice)
      const { activeWhiteboardId, openWhiteboardIds } = get();
      
      const newOpenIds = openWhiteboardIds.filter(wbId => wbId !== id);
      set({ openWhiteboardIds: newOpenIds });

      // If we closed the active whiteboard, switch to another one
      if (activeWhiteboardId === id) {
          // Switch to main or the previous one in list
          get().setWhiteboard('main');
      }
  },

  updateBrowserState: (whiteboardId: string, state: Partial<BrowserState>) => {
      set((s) => ({
          browserStates: {
              ...s.browserStates,
              [whiteboardId]: {
                  ...(s.browserStates[whiteboardId] || { 
                      url: '', 
                      displayInput: '',
                      tabs: [{ id: '1', url: '', displayInput: '', title: 'New Tab' }],
                      activeTabId: '1',
                      isAutoSyncEnabled: false
                  }),
                  ...state
              }
          }
      }));
      
      const { browserStates } = get();
      if (typeof window !== 'undefined') {
          localStorage.setItem('browser_states', JSON.stringify(browserStates));
      }

      // Debounced Persistence (Electron)
      if (isElectron()) {
          const store = get() as any;
          if (store._saveTimeout) clearTimeout(store._saveTimeout);
          
          store._saveTimeout = setTimeout(() => {
              const currentState = get().browserStates[whiteboardId];
              if (currentState) {
                  // Save Tabs
                  (window as any).electron.storage.tabs.save(whiteboardId, currentState.tabs);
                  
                  // Save UI State (Active Tab)
                  (window as any).electron.storage.ui.save({
                      whiteboard_id: whiteboardId,
                      active_tab_id: currentState.activeTabId,
                      viewport_x: 0, // Placeholder
                      viewport_y: 0,
                      viewport_zoom: 1,
                      updated_at: Date.now()
                  });
              }
          }, 1000);
      }
  },

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

        const storedBrowser = localStorage.getItem('browser_states');
        if (storedBrowser) {
            try {
                set({ browserStates: JSON.parse(storedBrowser) });
            } catch (e) {
                console.error("Failed to parse browser_states from localStorage", e);
            }
        }
        
        // Initial fetch from API if possible
        if (sessionStorage.getItem('auth_token')) {
            if (isElectron()) {
                (window as any).electron.storage.sync.setToken(sessionStorage.getItem('auth_token'));
            }
            get().fetchWhiteboards();
        }
    }

    // Add listener for login/logout to update Electron token
    if (typeof window !== 'undefined' && isElectron()) {
        window.addEventListener('auth-state-changed', () => {
            const token = sessionStorage.getItem('auth_token');
            (window as any).electron.storage.sync.setToken(token);
        });
    }
  },

  fetchWhiteboards: async () => {
    try {
        const apiWbs = isElectron() 
            ? await storage.whiteboards.list()
            : await whiteboardsApi.list();
        if (apiWbs && apiWbs.length > 0) {
            set({ whiteboards: apiWbs });
            localStorage.setItem('whiteboards', JSON.stringify(apiWbs));
        } else {
            // New user or empty backend, ensure 'main' exists
            const defaultWb = { id: 'main', name: 'Main Brain' };
            if (isElectron()) {
                await storage.whiteboards.create({
                    ...defaultWb,
                    user_id: sessionStorage.getItem('user_id') || 'local'
                });
            } else {
                await whiteboardsApi.create(defaultWb);
            }
            set({ whiteboards: [defaultWb] });
            localStorage.setItem('whiteboards', JSON.stringify([defaultWb]));
        }
        // Force refresh nodes for active whiteboard
        get().fetchNodes();
    } catch (e) {
        console.error("Failed to fetch whiteboards", e);
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
        style: { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: 'none' },
        markerEnd: {
            type: MarkerType.Arrow,
            color: '#9ca3af',
        },
    }));
    set({ edges: uniqueEdges });
  },

  createWhiteboard: async (providedName?: string) => {
    const existingWhiteboards = get().whiteboards;
    
    let name = providedName;
    if (!name || name === 'New Canvas') {
      const untitledRegex = /^Untitled-(\d+)$/;
      let maxNum = 0;
      
      existingWhiteboards.forEach(wb => {
        const match = wb.name.match(untitledRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      
      name = `Untitled-${maxNum + 1}`;
    }

    const id = `board-${Date.now()}`;
    const newWb = { id, name };
    
    try {
        if (isElectron()) {
            await storage.whiteboards.create({
                ...newWb,
                user_id: sessionStorage.getItem('user_id') || 'local'
            });
        } else {
            await whiteboardsApi.create(newWb);
        }
        
        set(state => ({
            whiteboards: [...state.whiteboards, newWb],
            openWhiteboardIds: [...state.openWhiteboardIds, id],
        }));

        await get().setWhiteboard(id);
        return id;
    } catch (e) {
        console.error("Failed to create whiteboard", e);
        throw e;
    }
  },

  setWhiteboard: async (id: string) => {
    // Ensure it's in open tabs
    const { openWhiteboardIds } = get();
    if (!openWhiteboardIds.includes(id)) {
        set({ openWhiteboardIds: [...openWhiteboardIds, id] });
    }

    // Try to load state from Electron
    if (isElectron()) {
        try {
            const tabs = await (window as any).electron.storage.tabs.load(id);
            const uiState = await (window as any).electron.storage.ui.load(id);

            if (tabs && tabs.length > 0) {
                const mappedTabs: Tab[] = tabs.map((t: any) => ({
                    id: t.id,
                    url: t.url,
                    displayInput: t.display_input || t.url,
                    title: t.title || 'New Tab',
                    isLoading: !!t.is_loading,
                    lastNodeId: t.last_node_id,
                    canGoBack: false, 
                    canGoForward: false
                }));

                const activeTabId = uiState?.active_tab_id || mappedTabs[0].id;
                
                const browserState = {
                    url: mappedTabs.find(t => t.id === activeTabId)?.url || '',
                    displayInput: mappedTabs.find(t => t.id === activeTabId)?.displayInput || '',
                    tabs: mappedTabs,
                    activeTabId: activeTabId,
                    isAutoSyncEnabled: false
                };
                
                set(state => ({
                    browserStates: {
                        ...state.browserStates,
                        [id]: browserState
                    }
                }));
            }
        } catch (e) {
             console.error('Failed to load tabs', e);
        }
    }

    set({ activeWhiteboardId: id, nodes: [], edges: [] });
    
    // Save whiteboard list if it's new
    const { whiteboards } = get();
    const exists = whiteboards.some(wb => wb.id === id);
    if (typeof window !== 'undefined') {
        localStorage.setItem('whiteboards', JSON.stringify(whiteboards));
    }

    console.log(`[Store] Fetching data for whiteboard: ${id}`);
    try {
        const [apiNodes, apiEdges] = isElectron()
            ? await Promise.all([
                storage.nodes.list(id),
                storage.edges.list(id)
            ])
            : await Promise.all([
                nodesApi.list(id),
                edgesApi.list(id)
            ]);
        
        // Transform ApiNodes to ReactFlow Nodes
        const flowNodes = apiNodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'article', // Default type
            position: n.metadata?.position || { x: n.position_x || 0, y: n.position_y || 0 },
            data: { 
                title: n.title,
                url: n.url,
                content: n.content,
                outline: n.outline,
                ...(typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {})
            },
            style: n.metadata?.style,
            parentId: n.metadata?.parentId,
        }));

        // Transform Edges if from Electron (SQLite uses source_id/target_id and snake_case handles)
        const flowEdges = isElectron() 
            ? (apiEdges || []).map((e: any) => ({
                ...e,
                source: e.source_id || e.source,
                target: e.target_id || e.target,
                sourceHandle: e.source_handle || e.sourceHandle,
                targetHandle: e.target_handle || e.targetHandle,
            }))
            : (apiEdges || []);
        
        // Deduplicate
        const uniqueNodes = Array.from(new Map(flowNodes.map((node: any) => [node.id, node])).values());
        
        // Sanitize parentIds - remove if parent doesn't exist
        const nodeIds = new Set(uniqueNodes.map((n: any) => n.id));
        const sanitizedNodes: any[] = uniqueNodes.map((n: any) => ({
            ...n,
            parentId: n.parentId && nodeIds.has(n.parentId) ? n.parentId : undefined
        }));

        set({ nodes: sanitizedNodes, edges: flowEdges });
    } catch(e) {
        console.error("Failed to set whiteboard", e);
    }
  },

  fetchNodes: async () => {
      const { activeWhiteboardId } = get();
      try {
          // Use local storage if in Electron, otherwise fall back to API
          const [apiNodes, apiEdges] = isElectron()
            ? await Promise.all([
                storage.nodes.list(activeWhiteboardId),
                storage.edges.list(activeWhiteboardId)
              ])
            : await Promise.all([
                nodesApi.list(activeWhiteboardId),
                edgesApi.list(activeWhiteboardId)
              ]);

        const flowNodes = apiNodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'article',
            position: n.metadata?.position || (n.position_x !== undefined 
                ? { x: n.position_x || 0, y: n.position_y || 0 }
                : { x: Math.random() * 500, y: Math.random() * 500 }),
            data: { 
                title: n.title,
                url: n.url,
                content: n.content,
                label: n.metadata?.label || (typeof n.metadata === 'string' ? JSON.parse(n.metadata).label : undefined),
                text: n.metadata?.text || (typeof n.metadata === 'string' ? JSON.parse(n.metadata).text : undefined),
                ...(typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {})
            },
            style: n.metadata?.style || (typeof n.metadata === 'string' ? JSON.parse(n.metadata).style : undefined),
            parentId: n.metadata?.parentId || (typeof n.metadata === 'string' ? JSON.parse(n.metadata).parentId : undefined),
        }));

        const flowEdges = isElectron() 
            ? (apiEdges || []).map((e: any) => ({
                ...e,
                source: e.source_id || e.source,
                target: e.target_id || e.target,
                sourceHandle: e.source_handle || e.sourceHandle,
                targetHandle: e.target_handle || e.targetHandle,
            }))
            : (apiEdges || []);

        const uniqueNodes = Array.from(new Map(flowNodes.map((node: any) => [node.id, node])).values());

        // Sanitize parentIds
        const nodeIds = new Set(uniqueNodes.map((n: any) => n.id));
        const sanitizedNodes = uniqueNodes.map((n: any) => ({
            ...n,
            parentId: n.parentId && nodeIds.has(n.parentId) ? n.parentId : undefined
        }));

        set({ nodes: sanitizedNodes, edges: flowEdges });
      } catch (e) {
          console.error("[Store] Failed to fetchNodes", e);
      }
  },

  addNode: async (node: Node, persist = true) => {
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

    if (persist) {
        try {
            if (isElectron()) {
                await storage.nodes.create({
                    id: node.id,
                    type: node.type || 'article',
                    title: node.data.title,
                    content: node.data.content,
                    url: node.data.url,
                    whiteboard_id: activeWhiteboardId,
                    user_id: node.data.user_id || 'local',
                    position_x: node.position.x,
                    position_y: node.position.y,
                    metadata: JSON.stringify(nodeWithWb.data)
                });
            } else {
                await nodesApi.create({
                    id: node.id,
                    type: node.type || 'article',
                    title: node.data.title,
                    url: node.data.url,
                    data: {
                        ...nodeWithWb.data,
                        style: node.style
                    }
                });
            }
        } catch(e) {
            console.error("Failed to persist node", e);
        }
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
        style: { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: 'none' },
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
        if (isElectron()) {
            await (window as any).electron.storage.edges.create({
                id: styledEdge.id!,
                source_id: styledEdge.source!,
                target_id: styledEdge.target!,
                label: (styledEdge as any).label,
                whiteboard_id: activeWhiteboardId,
                user_id: 'local',
                source_handle: styledEdge.sourceHandle,
                target_handle: styledEdge.targetHandle,
                edge_type: styledEdge.type || 'default',
            });
        } else {
            await edgesApi.create(styledEdge, activeWhiteboardId);
        }
    } catch(e) {
        console.error("Failed to persist edge", e);
    }
  },

  removeNode: async (id: string) => {
    const { activeWhiteboardId, edges } = get();
    
    // Optimistic update
    set((state) => ({
      nodes: state.nodes
        .filter(n => n.id !== id)
        .map(n => n.parentId === id ? { ...n, parentId: undefined } : n),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));

    try {
        // Delete node on backend or local storage
        if (isElectron()) {
            await storage.nodes.delete(id);
        } else {
            await nodesApi.delete(id);
        }
        
        // Find and delete all edges connected to this node
        const edgesToDelete = edges.filter(e => e.source === id || e.target === id);
        await Promise.all(edgesToDelete.map(e => {
            if (isElectron()) {
                return storage.edges.delete(e.id).catch(() => {});
            } else {
                return edgesApi.delete(e.id, activeWhiteboardId).catch(() => {});
            }
        }));
    } catch(e) {
        console.error("Failed to persist node deletion", e);
    }
  },

  removeEdge: async (id: string) => {
    const { activeWhiteboardId, edges } = get();
    
    // Check if the edge exists locally before trying to delete
    const exists = edges.some(e => e.id === id);
    if (!exists) return;

    set((state) => ({
      edges: state.edges.filter(e => e.id !== id),
    }));

    try {
        if (isElectron()) {
            await storage.edges.delete(id);
        } else {
            await edgesApi.delete(id, activeWhiteboardId);
        }
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

  updateWhiteboard: async (id: string, name: string) => {
    // Local state update
    set((state) => ({
      whiteboards: state.whiteboards.map(wb => 
        wb.id === id ? { ...wb, name } : wb
      ),
    }));

    // Persistence
    try {
        if (isElectron()) {
            await storage.whiteboards.update(id, { name });
        }
        await whiteboardsApi.update(id, { name });
    } catch (e) {
        console.error("Failed to persist whiteboard renaming", e);
    }
  },

  updateNodeAndPersist: async (id: string, updates: Partial<any>) => {
    const node = get().nodes.find(n => n.id === id);
    if (!node) return;

    // Local update
    set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === id ? { ...n, ...updates, data: { ...n.data, ...(updates.data || {}) } } : n
      ),
    }));

    // Backend update
    try {
        const updatedNode = get().nodes.find(n => n.id === id);
        if (updatedNode) {
            // Local Storage Sync (Electron)
            if (isElectron()) {
                await storage.nodes.update(id, {
                    title: updatedNode.data.title,
                    content: updatedNode.data.content,
                    position_x: updatedNode.position.x,
                    position_y: updatedNode.position.y,
                    metadata: JSON.stringify(updatedNode.data)
                });
            }

            // Cloud API Sync
            await nodesApi.update(id, {
                title: updatedNode.data.title,
                type: updatedNode.type,
                content: updatedNode.data.content,
                metadata: {
                    ...updatedNode.data,
                    position: updatedNode.position,
                    style: updatedNode.style,
                    parentId: updatedNode.parentId
                }
            });
        }
    } catch(e) {
        console.error("Failed to persist node update", e);
    }
  },

  removeWhiteboard: async (id: string) => {
      const { activeWhiteboardId, whiteboards, openWhiteboardIds } = get();
      if (id === 'main') return; // Cannot delete main

      const newWhiteboards = whiteboards.filter(wb => wb.id !== id);
      const newOpenIds = openWhiteboardIds.filter(wbId => wbId !== id);
      
      set({ 
          whiteboards: newWhiteboards,
          openWhiteboardIds: newOpenIds
      });

      if (activeWhiteboardId === id) {
          await get().setWhiteboard('main');
      }

      // Persistence
      try {
          if (isElectron()) {
              await storage.whiteboards.delete(id);
          }
          await whiteboardsApi.delete(id);
      } catch (e) {
          console.error("Failed to persist whiteboard deletion", e);
      }
  },

  onNodesChange: (changes: NodeChange[]) => {
    const { activeWhiteboardId, edges } = get();
    
    // Handle deletions
    changes.forEach(change => {
        if (change.type === 'remove') {
            // Delete node on appropriate storage
            if (isElectron()) {
                storage.nodes.delete(change.id).catch(err => {
                    console.error("Failed to delete node in Electron storage", err);
                });
            } else {
                nodesApi.delete(change.id).catch(err => {
                    if (!err.message?.includes('404')) {
                        console.error("Failed to delete node in onNodesChange", err);
                    }
                });
            }

            // Find and delete all edges connected to this node
            const edgesToDelete = edges.filter(e => e.source === change.id || e.target === change.id);
            edgesToDelete.forEach(edge => {
                if (isElectron()) {
                    storage.edges.delete(edge.id).catch(() => {});
                } else {
                    edgesApi.delete(edge.id, activeWhiteboardId).catch(() => {});
                }
            });
        }
    });

    const nextNodes = applyNodeChanges(changes, get().nodes);
    
    // Cleanup parentIds for removed nodes
    const removedIds = new Set(changes.filter(c => c.type === 'remove').map(c => (c as any).id));
    const finalNodes = removedIds.size > 0 
        ? nextNodes.map(n => n.parentId && removedIds.has(n.parentId) ? { ...n, parentId: undefined } : n)
        : nextNodes;

    set({
      nodes: finalNodes,
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    const { activeWhiteboardId } = get();
    
    // Handle deletions
    changes.forEach(change => {
        if (change.type === 'remove') {
            const exists = get().edges.some(e => e.id === change.id);
            if (exists) {
                if (isElectron()) {
                    storage.edges.delete(change.id).catch(err => {
                        console.error("Failed to delete edge in Electron storage", err);
                    });
                } else {
                    edgesApi.delete(change.id, activeWhiteboardId).catch(err => {
                        if (!err.message?.includes('404')) {
                            console.error("Failed to delete edge in onEdgesChange", err);
                        }
                    });
                }
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
