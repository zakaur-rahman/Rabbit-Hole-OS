import React from 'react';

export function MemorySystem() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
       <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '24px', margin: '0 0 8px 0', color: 'var(--text)' }}>Knowledge Memory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Structured concepts and relationships extracted across sessions.</p>
       </div>

       <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {[
            { tag: 'Concept', name: 'Agent Protocols', count: 12 },
            { tag: 'Entity', name: 'Cognode OS', count: 4 },
            { tag: 'Pattern', name: 'Graph DB Schema', count: 8 },
            { tag: 'Idea', name: 'Visual AST Logic', count: 2 },
          ].map((item, i) => (
             <div key={i} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--amber-l)', marginBottom: '4px' }}>{item.tag}</div>
                <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '8px' }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.count} references</div>
             </div>
          ))}
       </div>
    </div>
  );
}
