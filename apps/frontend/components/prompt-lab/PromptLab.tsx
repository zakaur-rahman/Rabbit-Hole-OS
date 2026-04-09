"use client";

import React, { useState } from 'react';


export function PromptLab() {
  const [prompt, setPrompt] = useState('You are an expert AI research scientist.\n\nExtract the core entities and their relationships from the provided document...\n\nOutput as strictly structured JSON.');
  const [isTestRunning, setIsTestRunning] = useState(false);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg)' }}>
      {/* LEFT PANEL - Editor */}
      <div style={{ flex: 1, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
            System Prompt Editor
          </div>
          <div>
             <button style={{ background: 'var(--amber)', color: 'var(--bg)', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-dm-mono)' }}>Run Test ↺</button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '10px', color: 'var(--sub)', letterSpacing: '0.05em' }}>Prompt Template</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(17, 16, 9, 0.5)',
              border: '1px solid var(--border2)',
              borderRadius: '6px',
              padding: '16px',
              color: 'var(--amber-l)',
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
            }}
          />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: '10px', color: 'var(--sub)', letterSpacing: '0.05em' }}>Model Configuration</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <select style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-dm-mono)' }}>
              <option>gemini-2.5-flash-lite</option>
              <option>gemini-1.5-pro</option>
              <option>gpt-4o-mini</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
               <span>Temp: 0.2</span>
               <input type="range" min="0" max="1" step="0.1" defaultValue="0.2" style={{ accentColor: 'var(--amber)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Output Preview */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
         <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
            Execution Output
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-mid)', fontFamily: 'var(--font-dm-mono)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              <span style={{ color: 'var(--green)' }}>✓ Ready to execute.</span> Select a dataset or document node in the workspace to test this prompt against.
            </div>
          </div>
      </div>
    </div>
  );
}
