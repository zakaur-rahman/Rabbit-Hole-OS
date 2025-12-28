const API_BASE = 'http://localhost:8000/api/v1';
import { Edge } from 'reactflow';

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Node Types
export interface ApiNode {
  id: string;
  type: string;
  url: string;
  title: string;
  content: string;
  snippet: string;
  created_at: string;
  metadata: {
    author?: string;
    date?: string;
    description?: string;
    [key: string]: any;
  };
  data?: any;
  outline?: any[];
}

// Nodes API
export const nodesApi = {
  processUrl: (url: string, whiteboardId: string = 'main', nodeId?: string): Promise<ApiNode> => {
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('whiteboard_id', whiteboardId);
    if (nodeId) params.append('node_id', nodeId);
    return apiFetch(`/nodes/process_url?${params.toString()}`, { method: 'POST' });
  },

  create: (node: Partial<ApiNode>): Promise<ApiNode> =>
    apiFetch('/nodes/', {
      method: 'POST',
      body: JSON.stringify(node),
    }),
  
  update: (id: string, node: Partial<ApiNode>): Promise<ApiNode> =>
    apiFetch(`/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(node),
    }),
  
  list: (whiteboardId: string = 'main', type?: string): Promise<ApiNode[]> => {
    const params = new URLSearchParams();
    if (whiteboardId) params.append('whiteboard_id', whiteboardId);
    if (type) params.append('type', type);
    return apiFetch(`/nodes/?${params.toString()}`);
  },
  
  get: (id: string): Promise<ApiNode> =>
    apiFetch(`/nodes/${id}`),
  
  delete: (id: string): Promise<{ status: string; id: string }> =>
    apiFetch(`/nodes/${id}`, { method: 'DELETE' }),
  
  getRelated: (id: string): Promise<ApiNode[]> =>
    apiFetch(`/nodes/${id}/related`),
};

// Synthesis Types
export interface SynthesisRequest {
  node_ids: string[];
  query: string;
}

export interface SynthesisResponse {
  summary: string;
  sources: string[];
  query: string;
}

// Synthesis API
export const synthesisApi = {
  generate: (request: SynthesisRequest): Promise<SynthesisResponse> =>
    apiFetch('/synthesis/', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  
  getEdgeLabel: (sourceId: string, targetId: string): Promise<{ label: string }> =>
    apiFetch('/synthesis/edge-label', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    }),
  
  search: (query: string): Promise<{ results: ApiNode[]; query: string }> =>
    apiFetch('/synthesis/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit: 10 }),
    }),
};

// Edges API
export const edgesApi = {
  list: (whiteboardId: string): Promise<Edge[]> =>
    apiFetch(`/edges/?whiteboard_id=${whiteboardId}`),

  create: (edge: Edge, whiteboardId: string): Promise<Edge> =>
    apiFetch(`/edges/?whiteboard_id=${whiteboardId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edge),
    }),

  delete: (edgeId: string, whiteboardId: string): Promise<void> =>
    apiFetch(`/edges/${edgeId}?whiteboard_id=${whiteboardId}`, { method: 'DELETE' }),
};

// Files API
export const filesApi = {
  upload: async (file: File): Promise<{ filename: string; url: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Use raw fetch for FormData as generic wrapper might default to JSON content type
    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
        throw new Error('Upload failed');
    }
    
    return response.json();
  },
  
  list: (): Promise<{ filename: string; url: string }[]> =>
    apiFetch('/files/list'),
};

// Health check
export const healthApi = {
  check: (): Promise<{ status: string }> =>
    apiFetch('/health'),
};

// Legacy export for backwards compatibility
export const fetchAPI = apiFetch;
