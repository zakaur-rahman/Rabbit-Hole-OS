"use client";

import React, { useState } from 'react';
import { WorkspaceCanvas } from "../../components/graph/WorkspaceCanvas";
import { PromptLab } from "../../components/prompt-lab/PromptLab";
import { MemorySystem } from "../../components/memory/MemorySystem";
import { SynthesisViewer } from "../../components/synthesis/SynthesisViewer";

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<'graph' | 'prompt' | 'memory' | 'viewer'>('graph');

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* GLOBAL HEADER */}
      <header style={{ height: '48px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '30px', background: 'rgba(17, 16, 9, 0.9)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--amber)', borderRadius: '4px' }}></div>
          <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '16px' }}>Cognode</span>
        </div>
        
        <nav style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <button 
            onClick={() => setActiveTab('graph')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: activeTab === 'graph' ? 'var(--amber)' : 'var(--text-muted)',
              borderBottom: activeTab === 'graph' ? '2px solid var(--amber)' : '2px solid transparent',
              padding: '14px 0', transition: 'all 0.2s'
            }}>
            Workspace
          </button>

          <button 
            onClick={() => setActiveTab('prompt')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: activeTab === 'prompt' ? 'var(--amber)' : 'var(--text-muted)',
              borderBottom: activeTab === 'prompt' ? '2px solid var(--amber)' : '2px solid transparent',
              padding: '14px 0', transition: 'all 0.2s'
            }}>
            Prompt Lab
          </button>
          <button 
            onClick={() => setActiveTab('memory')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: activeTab === 'memory' ? 'var(--amber)' : 'var(--text-muted)',
              borderBottom: activeTab === 'memory' ? '2px solid var(--amber)' : '2px solid transparent',
              padding: '14px 0', transition: 'all 0.2s'
            }}>
            Memory
          </button>
          <button 
            onClick={() => setActiveTab('viewer')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: activeTab === 'viewer' ? 'var(--amber)' : 'var(--text-muted)',
              borderBottom: activeTab === 'viewer' ? '2px solid var(--amber)' : '2px solid transparent',
              padding: '14px 0', transition: 'all 0.2s'
            }}>
            Report Viewer
          </button>
        </nav>
      </header>

      {/* MAIN VIEW */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'graph' && <WorkspaceCanvas />}
        {activeTab === 'prompt' && <PromptLab />}
        {activeTab === 'memory' && <MemorySystem />}
        {activeTab === 'viewer' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <SynthesisViewer />
          </div>
        )}
      </main>
    </div>
  );
}
