import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface AstLogicNodeData {
  condition: string;
  action: string;
}

const AstLogicNode = ({ data, selected }: NodeProps<AstLogicNodeData>) => {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '4px',
        background: 'rgba(25, 24, 23, 0.9)',
        border: `1px dashed ${selected ? 'white' : 'var(--warn-border)'}`,
        minWidth: '220px',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--sub)' }} />
      
      <div style={{ fontSize: '9px', color: 'var(--warn)', fontFamily: 'var(--font-dm-mono)', marginBottom: '4px' }}>
        IF <span style={{ color: 'white' }}>{data.condition}</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
        → {data.action}
      </div>

      {/* Two outputs: True / False logic flow */}
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: 'var(--green)' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: 'var(--danger)' }} />
    </div>
  );
};

export default memo(AstLogicNode);
