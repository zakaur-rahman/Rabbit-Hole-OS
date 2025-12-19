export interface SynthesisData {
  id: string;
  query: string;
  summary: string;
  sourceNodeIds: string[];
  createdAt: string;
}

export interface SynthesisRequest {
  nodeIds: string[];
  query: string;
}

export interface SynthesisResponse {
  synthesis: SynthesisData;
}
