import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import AgentNode, { AgentNodeData } from './nodes/AgentNode';
import TopicNode, { TopicNodeData } from './nodes/TopicNode';
import DocumentNode, { DocumentNodeData } from './nodes/DocumentNode';
import AstLogicNode, { AstLogicNodeData } from './nodes/AstLogicNode';

const nodeTypes = {
  agentNode: AgentNode,
  topicNode: TopicNode,
  documentNode: DocumentNode,
  astNode: AstLogicNode,
};

const initialNodes: Node[] = [
  {
    id: 'topic-1',
    type: 'topicNode',
    position: { x: 50, y: 50 },
    data: { label: 'Autonomous Agents', summary: 'Research on autonomous cognitive systems and multi-agent coordination frameworks.' } as TopicNodeData,
  },
  {
    id: 'doc-1',
    type: 'documentNode',
    position: { x: 50, y: 220 },
    data: { title: 'AI_Alignment_2025.pdf', type: 'PDF', extractedIdeas: 14 } as DocumentNodeData,
  },
  {
    id: 'doc-2',
    type: 'documentNode',
    position: { x: 50, y: 320 },
    data: { title: 'arxiv.org/abs/2304.03442', type: 'URL', extractedIdeas: 8 } as DocumentNodeData,
  },
  {
    id: 'agent-1',
    type: 'agentNode',
    position: { x: 400, y: 150 },
    data: { label: 'Literature Reviewer', tag: 'Aggregates Research', status: 'done' } as AgentNodeData,
  },
  {
    id: 'ast-1',
    type: 'astNode',
    position: { x: 400, y: 280 },
    data: { condition: 'confidence < 0.8', action: 'Run deeper search' } as AstLogicNodeData,
  },
  {
    id: 'agent-2',
    type: 'agentNode',
    position: { x: 750, y: 150 },
    data: { label: 'Synthesis Engine', tag: 'Generates Insights', status: 'running' } as AgentNodeData,
  },
];

const initialEdges: Edge[] = [
  { id: 'e-t1-a1', source: 'topic-1', target: 'agent-1', animated: true, style: { stroke: 'rgba(200,134,10,0.5)', strokeWidth: 1.5 } },
  { id: 'e-d1-a1', source: 'doc-1', target: 'agent-1', style: { stroke: 'var(--border2)' } },
  { id: 'e-d2-a1', source: 'doc-2', target: 'agent-1', style: { stroke: 'var(--border2)' } },
  { id: 'e-a1-ast1', source: 'agent-1', target: 'ast-1', style: { stroke: 'rgba(200,134,10,0.8)', strokeWidth: 2 } },
  { id: 'e-ast1-a2', source: 'ast-1', sourceHandle: 'true', target: 'agent-2', animated: true, style: { stroke: 'var(--green-border)', strokeWidth: 1.5 } },
];

export function WorkspaceCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="rgba(200, 134, 10, 0.05)" gap={52} size={1.5} />
        <Controls style={{ background: 'rgba(17, 16, 9, 0.8)', border: '1px solid var(--border)', fill: 'var(--text)', filter: 'invert(1)' }} />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'agentNode') return 'var(--amber)';
            return 'var(--sub)';
          }}
          maskColor="rgba(10, 9, 6, 0.7)"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  );
}
