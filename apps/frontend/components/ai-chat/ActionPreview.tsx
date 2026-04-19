'use client';

import React from 'react';
import { Check, X, Zap } from 'lucide-react';
import type { ActionPreview as ActionPreviewType } from '@/types/chat';

interface ActionPreviewProps {
  preview: ActionPreviewType;
  onConfirm: () => void;
  onReject: () => void;
}

export default function ActionPreview({ preview, onConfirm, onReject }: ActionPreviewProps) {
  const stats = [];
  if (preview.nodesToCreate) stats.push(`${preview.nodesToCreate} node${preview.nodesToCreate > 1 ? 's' : ''} to create`);
  if (preview.edgesToCreate) stats.push(`${preview.edgesToCreate} edge${preview.edgesToCreate > 1 ? 's' : ''} to link`);
  if (preview.nodesToDelete) stats.push(`${preview.nodesToDelete} node${preview.nodesToDelete > 1 ? 's' : ''} to delete`);

  return (
    <div className="mx-3 my-2 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-[var(--amber)]/10">
        <div className="w-5 h-5 rounded-md bg-[var(--amber)]/15 flex items-center justify-center">
          <Zap size={12} className="text-[var(--amber)]" />
        </div>
        <span className="text-xs font-medium text-[var(--text)]">AI Action Preview</span>
      </div>

      {/* Description */}
      <div className="px-3.5 py-2.5">
        <p className="text-[12px] text-[var(--text-mid)] leading-relaxed">
          {preview.description}
        </p>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stats.map((stat, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--sub)]"
              >
                {stat}
              </span>
            ))}
          </div>
        )}

        {/* Tool calls preview */}
        {preview.toolCalls.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {preview.toolCalls.slice(0, 5).map((tc, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--sub)]">
                <span className="w-1 h-1 rounded-full bg-[var(--amber)]" />
                <span className="font-mono">{tc.tool}</span>
                <span className="text-[var(--muted)]">
                  {tc.args.title ? `"${tc.args.title}"` : ''}
                </span>
              </div>
            ))}
            {preview.toolCalls.length > 5 && (
              <div className="text-[10px] text-[var(--muted)] pl-3">
                +{preview.toolCalls.length - 5} more actions...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3.5 py-2.5 flex gap-2 border-t border-[var(--amber)]/10">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--amber)]/15 hover:bg-[var(--amber)]/25 text-[var(--amber)] text-xs font-medium transition-all duration-200 border border-[var(--amber)]/20 hover:border-[var(--amber)]/40"
        >
          <Check size={13} />
          Proceed
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--raised)] text-[var(--sub)] text-xs font-medium transition-all duration-200 border border-[var(--border)]"
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
}
