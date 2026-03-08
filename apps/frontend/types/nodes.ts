/**
 * Typed node data interfaces for all ReactFlow node types in Rabbit Hole OS.
 * These replace the widespread `any` usage in CanvasView, graph.store, and node components.
 */

// ─── Base ────────────────────────────────────────────────────────────────────

export interface BaseNodeData {
  title?: string;
  /** Backend whiteboard id */
  whiteboard_id?: string;
  /** AI-generated topic outline */
  outline?: string[];
  /** User-selected topics for synthesis focus */
  selectedTopics?: string[];
  /** Whether the node has a system instruction attached */
  hasInstruction?: boolean;
}

// ─── Article / Web ───────────────────────────────────────────────────────────

export interface ArticleNodeData extends BaseNodeData {
  url?: string;
  content?: string;
  snippet?: string;
  favicon?: string;
  authors?: string[];
  publishedDate?: string;
}

export interface WebNodeData extends BaseNodeData {
  url?: string;
}

// ─── Code ────────────────────────────────────────────────────────────────────

export interface CodeNodeData extends BaseNodeData {
  /** The code content string */
  content?: string;
  /** Programming language, e.g. "python", "typescript" */
  language?: string;
}

// ─── Image ───────────────────────────────────────────────────────────────────

export interface ImageNodeData extends BaseNodeData {
  url?: string;
  /** Alt text / description for synthesis */
  alt?: string;
  description?: string;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export interface PdfNodeData extends BaseNodeData {
  url?: string;
  content?: string;
}

// ─── Note ────────────────────────────────────────────────────────────────────

export interface NoteNodeData extends BaseNodeData {
  /** Rich-text HTML content from Tiptap */
  content?: string;
  tags?: string[];
}

// ─── Academic ────────────────────────────────────────────────────────────────

export interface AcademicNodeData extends BaseNodeData {
  url?: string;
  content?: string;
  authors?: string[];
  journal?: string;
  doi?: string;
  abstract?: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductNodeData extends BaseNodeData {
  url?: string;
  price?: string;
  brand?: string;
  rating?: string;
  description?: string;
  imageUrl?: string;
}

// ─── Group ───────────────────────────────────────────────────────────────────

export interface GroupNodeData extends BaseNodeData {
  label?: string;
}

// ─── Text / Annotation / Comment ─────────────────────────────────────────────

export interface TextNodeData extends BaseNodeData {
  text?: string;
}

export interface AnnotationNodeData extends BaseNodeData {
  content?: string;
}

export interface CommentNodeData extends BaseNodeData {
  content?: string;
}

// ─── Canvas (nested whiteboard) ───────────────────────────────────────────────

export interface CanvasNodeData extends BaseNodeData {
  /** The whiteboard ID this canvas node links to */
  canvasId?: string;
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type NodeType =
  | 'article'
  | 'video'
  | 'synthesis'
  | 'product'
  | 'code'
  | 'academic'
  | 'ghost'
  | 'note'
  | 'image'
  | 'pdf'
  | 'group'
  | 'text'
  | 'annotation'
  | 'canvas'
  | 'web'
  | 'comment';

/** Union of all node data types — use this instead of `any` in node components. */
export type AnyNodeData =
  | ArticleNodeData
  | WebNodeData
  | CodeNodeData
  | ImageNodeData
  | PdfNodeData
  | NoteNodeData
  | AcademicNodeData
  | ProductNodeData
  | GroupNodeData
  | TextNodeData
  | AnnotationNodeData
  | CommentNodeData
  | CanvasNodeData;

/**
 * Metadata shape forwarded to synthesis API.
 * Populated from node.data fields relevant to each type.
 */
export interface NodeSynthesisMetadata {
  language?: string;
  authors?: string[];
  tags?: string[];
  description?: string;
  alt?: string;
  doi?: string;
  journal?: string;
  price?: string;
  brand?: string;
  rating?: string;
  [key: string]: unknown;
}

/** Extract synthesis metadata from any node's data object. */
export function extractSynthesisMetadata(data: AnyNodeData): NodeSynthesisMetadata {
  const d = data as Record<string, unknown>;
  return {
    language: typeof d.language === 'string' ? d.language : undefined,
    authors: Array.isArray(d.authors) ? d.authors : undefined,
    tags: Array.isArray(d.tags) ? d.tags : undefined,
    description: typeof d.description === 'string' ? d.description : undefined,
    alt: typeof d.alt === 'string' ? d.alt : undefined,
    doi: typeof d.doi === 'string' ? d.doi : undefined,
    journal: typeof d.journal === 'string' ? d.journal : undefined,
    price: typeof d.price === 'string' ? d.price : undefined,
    brand: typeof d.brand === 'string' ? d.brand : undefined,
    rating: typeof d.rating === 'string' ? d.rating : undefined,
  };
}
