export type NodeType = 'article' | 'video' | 'synthesis' | 'pdf';

export interface NodeData {
  id: string;
  type: NodeType;
  url?: string;
  title: string;
  content?: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface Node extends NodeData {
  // Graph visualization properties can be added here if needed
  position?: { x: number; y: number };
}
