const API_BASE = 'http://127.0.0.1:8000/api/v1';
import { Edge } from 'reactflow';

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  // Get token from localStorage (matches auth/api.ts logic)
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

export interface ValidationIssue {
  severity: 'critical' | 'warning';
  message: string;
  location: string;
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
  previous_summary?: string;
}

export interface SynthesisResponse {
  summary: string;
  sources: string[];
  query: string;
}

/**
 * Shared type for context items passed to all synthesis endpoints.
 * node_type and metadata power the type-aware chunk_service.
 */
export interface SynthesisContextItem {
  node_id: string;
  title: string;
  content: string;
  url: string;
  /** ReactFlow node type, e.g. "article" | "code" | "image" | "note" | "pdf" | "academic" | "product" | "canvas" | "group" */
  node_type?: string;
  /** Type-specific metadata (language, authors, alt, description, tags, etc.) */
  metadata?: Record<string, any>;
  selected_topics: string[];
  outline: any[];
  system_instruction?: string;
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
      method: "POST",
      body: JSON.stringify({ query, limit: 10 }),
    }),

  validateAST: async (document: any): Promise<{ valid: boolean; issues: ValidationIssue[] }> =>
    apiFetch('/synthesis/validate-ast', {
      method: "POST",
      body: JSON.stringify(document),
    }),

  generateResearchPdf: async (query: string, context_items: { title: string; content: string; url: string }[], use_dummy_data: boolean = false): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-pdf`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, use_dummy_data }),
    });
    if (!response.ok) throw new Error("Failed to generate PDF");
    return response.blob();
  },

  generateChunkedResearchPdf: async (
    query: string,
    context_items: SynthesisContextItem[],
    use_dummy_data: boolean = false,
    edges: Edge[] = []
  ): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-pdf-chunked`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, use_dummy_data, edges }),
    });
    if (!response.ok) throw new Error("Failed to generate chunked PDF");
    return response.blob();
  },

  generateLatexResearchPdf: async (
    query: string,
    context_items: SynthesisContextItem[],
    return_tex: boolean = false,
    use_dummy_data: boolean = false,
    edges: Edge[] = []
  ): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-latex`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, return_tex, use_dummy_data, edges }),
    });
    if (!response.ok) throw new Error("Failed to generate LaTeX PDF");
    return response.blob();
  },

  getResearchAST: async (
    query: string,
    context_items: SynthesisContextItem[],
    use_dummy_data: boolean = false,
    edges: Edge[] = [],
    whiteboardId?: string
  ): Promise<{ status: string; document: any }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-ast`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, use_dummy_data, edges, whiteboard_id: whiteboardId }),
    });
    if (!response.ok) throw new Error("Failed to generate AST");
    return response.json();
  },

  streamResearchAST: async (
    query: string,
    context_items: SynthesisContextItem[],
    edges: Edge[] = [],
    onUpdate: (step: { stage: string; status: string; message?: string; document?: any; error?: string }) => void,
    whiteboardId?: string
  ): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-ast-stream`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, edges, whiteboard_id: whiteboardId }),
    });

    if (!response.ok) throw new Error("Failed to start research stream");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in buffer
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          try {
            const data = JSON.parse(line.trim().slice(6));
            onUpdate(data);
          } catch (e) {
            console.error("Error parsing stream step", e);
          }
        }
      }
    }
  },

  generateASTPdf: async (
    query: string,
    context_items: SynthesisContextItem[],
    use_dummy_data: boolean = false,
    edges: Edge[] = [],
    whiteboardId?: string
  ): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-ast-pdf`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, context_items, use_dummy_data, edges, whiteboard_id: whiteboardId }),
    });
    if (!response.ok) throw new Error("Failed to generate AST PDF");
    return response.blob();
  },

  generatePdfFromAST: async (document: any, strict_mode: boolean = true): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/research-pdf-from-ast`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ document, strict_mode }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Failed to compile AST to PDF' }));
        // detail might be a string or the structured object { message, errors, broken_sections }
        throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
    }
    return response.blob();
  },

  regenerateSection: async (sectionId: string, sectionTitle: string, currentContent: string, sourceContext: string, referenceIds: string[]) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE}/synthesis/regenerate-section`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        section_id: sectionId,
        section_title: sectionTitle,
        current_content: currentContent,
        source_context: sourceContext,
        reference_ids: referenceIds
      })
    });
    if (!response.ok) throw new Error('Regeneration failed');
    return response.json();
  },

  getLatexFromAST: async (ast: any) => {
    const response = await fetch(`${API_BASE}/synthesis/research-ast-to-latex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ast)
    });
    if (!response.ok) throw new Error('Failed to convert AST to LaTeX');
    return response.json();
  },

  compileRawLatex: async (latexSource: string, strict_mode: boolean = true) => {
    const response = await fetch(`${API_BASE}/synthesis/compile-latex`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex_source: latexSource, strict_mode: strict_mode })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'LaTeX compilation failed' }));
        throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
    }
    return response.blob();
  }
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

// Whiteboards API
export interface ApiWhiteboard {
  id: string;
  name: string;
}

export const whiteboardsApi = {
  list: (): Promise<ApiWhiteboard[]> =>
    apiFetch('/whiteboards/'),
  
  create: (whiteboard: ApiWhiteboard): Promise<ApiWhiteboard> =>
    apiFetch('/whiteboards/', {
      method: 'POST',
      body: JSON.stringify(whiteboard),
    }),

  update: (id: string, whiteboard: Partial<ApiWhiteboard>): Promise<ApiWhiteboard> =>
    apiFetch(`/whiteboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(whiteboard),
    }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/whiteboards/${id}`, {
      method: 'DELETE',
    }),
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
