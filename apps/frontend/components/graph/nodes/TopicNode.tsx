import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface TopicNodeData {
  label: string;
  summary: string;
}

const TopicNode = ({ data, selected }: NodeProps<TopicNodeData>) => {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '6px',
        background: 'rgba(25, 24, 23, 0.9)',
        border: `1px solid ${selected ? 'var(--amber)' : 'var(--border2)'}`,
        minWidth: '250px',
        maxWidth: '300px',
        boxShadow: selected ? '0 0 16px var(--amber-dim)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--sub)' }} />
      
      <h3 style={{ fontSize: '14px', margin: '0 0 6px 0', color: 'var(--text)', fontFamily: 'var(--font-playfair), serif' }}>
        {data.label}
      </h3>
      <p style={{ fontSize: '10.5px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
        {data.summary}
      </p>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--sub)' }} />
    </div>
  );
};

export default memo(TopicNode);
