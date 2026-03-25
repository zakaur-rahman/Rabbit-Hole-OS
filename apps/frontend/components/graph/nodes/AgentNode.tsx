import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface AgentNodeData {
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  tag: string;
}

const AgentNode = ({ data, selected }: NodeProps<AgentNodeData>) => {
  const isRunning = data.status === 'running';
  const isDone = data.status === 'done';
  const isError = data.status === 'error';

  const borderColor = isRunning ? 'var(--amber)' : isDone ? 'var(--green-border)' : isError ? 'var(--danger-border)' : 'var(--border)';
  const bgColor = isRunning ? 'var(--amber-dim)' : isDone ? 'var(--green-dim)' : isError ? 'var(--danger-dim)' : 'var(--surface)';
  const iconColor = isRunning ? 'var(--amber)' : isDone ? 'var(--green)' : isError ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: 'rgba(17, 16, 9, 0.85)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${selected ? 'white' : borderColor}`,
        minWidth: '220px',
        boxShadow: selected ? '0 0 0 1px rgba(255,255,255,0.2)' : '0 4px 12px rgba(0,0,0,0.5)',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--text-muted)' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: `1px solid ${borderColor}`,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            fontSize: '10px',
            animation: isRunning ? 'pulse 1.3s ease-in-out infinite' : 'none',
          }}
        >
          {isDone ? '✓' : isError ? '✕' : '⚡'}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text)', fontWeight: 500, letterSpacing: '0.02em' }}>
            {data.label}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
            {data.tag}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
};

export default memo(AgentNode);
