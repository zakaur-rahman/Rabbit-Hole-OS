export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  createdAt: string;
}

export interface Edge extends EdgeData {
  // Graph visualization properties
  type?: string;
  animated?: boolean;
}
