import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface DocumentNodeData {
  title: string;
  type: 'PDF' | 'URL' | 'DATA';
  extractedIdeas: number;
}

const DocumentNode = ({ data, selected }: NodeProps<DocumentNodeData>) => {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '4px',
        background: 'rgba(28, 26, 24, 0.95)',
        border: `1px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
        borderLeft: `3px solid var(--blue)`,
        minWidth: '200px',
        boxShadow: selected ? '0 0 12px rgba(107, 159, 212, 0.2)' : '0 2px 5px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--sub)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.1em' }}>{data.type}</span>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.extractedIdeas} ideas</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--font-dm-mono)' }}>
        {data.title}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--sub)' }} />
    </div>
  );
};

export default memo(DocumentNode);
