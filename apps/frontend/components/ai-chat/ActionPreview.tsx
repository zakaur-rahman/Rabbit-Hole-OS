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
    <div className="mx-2 my-2 rounded-lg border border-[var(--ws-border)] bg-[var(--surface)] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="ws-run-header !py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={11} className="text-[var(--amber)]" />
          <span className="text-[11px] font-medium text-[var(--ws-text-sub)]">Action Preview</span>
        </div>
        <span className="ws-run-badge !text-[9px]">Review Required</span>
      </div>

      {/* Description */}
      <div className="px-3 py-2.5">
        <p className="text-[11.5px] text-[var(--ws-text)] leading-relaxed">
          {preview.description}
        </p>

        {/* Tool calls preview */}
        {preview.toolCalls.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {preview.toolCalls.slice(0, 5).map((tc, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--ws-text-dim)]">
                <span className="w-1 h-1 rounded-full bg-[var(--amber)]" />
                <span className="font-mono text-[var(--amber)] opacity-80">{tc.tool}</span>
                <span className="text-[var(--ws-text-muted)] truncate max-w-[200px]">
                  {(tc.args as Record<string, unknown>).title as string || (tc.args as Record<string, unknown>).id as string || ''}
                </span>
              </div>
            ))}
            {preview.toolCalls.length > 5 && (
              <div className="text-[9px] text-[var(--ws-text-dim)] pl-3">
                +{preview.toolCalls.length - 5} more actions...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-2 py-2 flex gap-2 border-t border-[var(--ws-border)] bg-[var(--raised)]">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[var(--amber-bg)] hover:bg-[var(--amber)]/20 text-[var(--amber)] text-[11px] font-medium transition-all border border-[var(--amber)]/20"
        >
          <Check size={12} />
          Proceed
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[var(--ws-bg)] hover:bg-[var(--ws-border)] text-[var(--ws-text-dim)] text-[11px] font-medium transition-all border border-[var(--ws-border)]"
        >
          <X size={12} />
          Reject
        </button>
      </div>
    </div>
  );
}
