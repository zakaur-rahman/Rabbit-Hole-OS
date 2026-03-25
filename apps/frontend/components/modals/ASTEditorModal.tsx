'use client';

/**
 * AST Editor Modal — Redesigned in Cognode amber editorial identity
 * Three-Pane Document AST Editor: Outline Tree · Section Editor · Live Preview
 *
 * Drop-in replacement: identical props, store hooks, and compile logic.
 * Only the visual layer has changed.
 */

import React, { useState, useCallback } from 'react';
import {
  useASTStore,
  DocumentAST,
  Section,
  Block,
  BlockType,
  ParagraphData,
  ListData,
  QuoteData,
  WarningData,
} from '../../store/ast.store';
import { synthesisApi, ValidationIssue } from '../../lib/api';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import LatexCodeEditor from '../ui/LatexCodeEditor';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout, X, Save, Zap, Download, Check,
  RotateCcw, Trash2, AlertCircle, AlertTriangle,
  Type, List as ListIcon, Quote as QuoteIcon,
  Book, FileText, File as FileIcon,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   CSS-in-JS token layer — all colours via CSS variables so the
   component inherits Cognode's [data-theme] dark/light swap.
───────────────────────────────────────────────────────────── */
const C = {
  paper:       'var(--cog-paper,      #0f0e0c)',
  surface:     'var(--cog-surface,    #111009)',
  raised:      'var(--cog-raised,     #171510)',
  border:      'var(--cog-border,     rgba(200,134,10,.2))',
  borderHi:    'var(--cog-border-hi,  rgba(200,134,10,.45))',
  amber:       'var(--cog-amber,      #c8860a)',
  amberL:      'var(--cog-amber-l,    #e8a020)',
  amberDim:    'var(--cog-amber-dim,  rgba(200,134,10,.08))',
  text:        'var(--cog-text,       #f0ece0)',
  textMid:     'var(--cog-text-mid,   rgba(240,236,224,.6))',
  textMuted:   'var(--cog-text-muted, rgba(240,236,224,.35))',
  danger:      '#e05050',
  dangerDim:   'rgba(220,80,60,.08)',
  dangerBorder:'rgba(220,80,60,.25)',
};

/* ─────────────────────────────────────────────────────────────
   Shared micro-styles
───────────────────────────────────────────────────────────── */
const baseInput: React.CSSProperties = {
  width: '100%',
  background: C.amberDim,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: "'DM Mono', monospace",
  fontSize: 12,
  fontWeight: 300,
  letterSpacing: '0.03em',
  lineHeight: 1.75,
  padding: '11px 14px',
  outline: 'none',
  borderRadius: 0,
  caretColor: C.amber,
  resize: 'vertical' as const,
  transition: 'border-color .2s, background .2s',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 400,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: C.amberL,
  marginBottom: 8,
};

/* ─────────────────────────────────────────────────────────────
   Loading overlay — amber rings instead of indigo spinner
───────────────────────────────────────────────────────────── */
const LoadingOverlay = ({ label }: { label?: string }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(10,9,6,.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}
  >
    {/* concentric amber rings */}
    <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(200,134,10,.12)', animation: 'cog-rspin 12s linear infinite' }} />
      <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid transparent', borderTopColor: 'rgba(200,134,10,.6)', animation: 'cog-rspin 2.4s cubic-bezier(.5,0,.5,1) infinite' }} />
      <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid transparent', borderTopColor: 'rgba(232,160,32,.7)', animation: 'cog-rspin 1.6s linear infinite reverse' }} />
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.amber, animation: 'cog-pulse 1.6s ease-in-out infinite' }} />
    </div>
    {label && (
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.amberL }}>
        {label}
      </span>
    )}
    <style>{`
      @keyframes cog-rspin { to { transform: rotate(360deg); } }
      @keyframes cog-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
    `}</style>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   Validation checklist panel
───────────────────────────────────────────────────────────── */
const ValidationPanel = ({
  issues, onClose, onProceed,
}: {
  issues: ValidationIssue[];
  onClose: () => void;
  onProceed: () => void;
}) => {
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(10,9,6,.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: .96, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        style={{
          width: 460,
          background: C.surface,
          border: `1px solid ${C.borderHi}`,
          padding: '32px 28px',
          fontFamily: "'DM Mono', monospace",
          position: 'relative',
        }}
      >
        {/* amber top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.amber }} />
        {/* corner brackets */}
        {(['tl','tr','bl','br'] as const).map(pos => (
          <span key={pos} style={{
            position: 'absolute', width: 8, height: 8,
            borderStyle: 'solid', borderColor: C.borderHi,
            ...(pos === 'tl' ? { top:0, left:0,  borderWidth:'1.5px 0 0 1.5px' } :
                pos === 'tr' ? { top:0, right:0, borderWidth:'1.5px 1.5px 0 0' } :
                pos === 'bl' ? { bottom:0, left:0,  borderWidth:'0 0 1.5px 1.5px' } :
                               { bottom:0, right:0, borderWidth:'0 1.5px 1.5px 0' }),
          }} />
        ))}

        <h3 style={{ margin: '0 0 6px', color: C.text, fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: '-.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: critical.length > 0 ? C.danger : C.amber, flexShrink: 0, display: 'inline-block' }} />
          Pre-compile Check
        </h3>
        <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMid, marginBottom: 22 }}>
          {critical.length > 0 ? `${critical.length} critical · ${warnings.length} warnings` : `${warnings.length} warnings — proceed with care`}
        </p>

        <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...critical, ...warnings].map((issue, i) => (
            <div key={i} style={{
              padding: '10px 14px',
              border: `1px solid ${issue.severity === 'critical' ? C.dangerBorder : C.border}`,
              background: issue.severity === 'critical' ? C.dangerDim : C.amberDim,
              borderLeft: `2.5px solid ${issue.severity === 'critical' ? C.danger : C.amber}`,
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: issue.severity === 'critical' ? C.danger : C.amberL, marginBottom: 4 }}>{issue.location}</div>
              <div style={{ fontSize: 11, color: C.text }}>{issue.message}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <CogBtn onClick={onClose}>Back to Editor</CogBtn>
          {critical.length === 0 && (
            <CogBtn variant="primary" onClick={onProceed}>Compile Anyway</CogBtn>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Shared button
───────────────────────────────────────────────────────────── */
function CogBtn({
  children, onClick, variant = 'ghost', disabled = false, title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary' | 'danger';
  disabled?: boolean;
  title?: string;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '7px 14px',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, fontWeight: 400,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    border: '1px solid',
    transition: 'all .2s',
    background: 'none',
    borderRadius: 0,
  };
  const variants = {
    ghost:   { borderColor: C.border,        color: C.textMid },
    primary: { borderColor: C.borderHi,      color: C.amber, background: C.amberDim },
    danger:  { borderColor: C.dangerBorder,  color: C.danger, background: C.dangerDim },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Outline sidebar item
───────────────────────────────────────────────────────────── */
const SidebarItem: React.FC<{
  section: Section;
  selectedId: string | null;
  isBroken: boolean;
  onSelect: (id: string) => void;
  renderChildren: (s: Section) => React.ReactNode;
}> = React.memo(({ section, selectedId, isBroken, onSelect, renderChildren }) => {
  const sel = selectedId === section.id;
  const Icon = section.level === 1 ? Book : section.level === 2 ? FileText : FileIcon;
  return (
    <div>
      <div
        onClick={() => onSelect(section.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: `8px 14px 8px ${section.level * 14 + 14}px`,
          borderLeft: `2px solid ${sel ? C.amber : 'transparent'}`,
          background: sel ? 'rgba(200,134,10,.08)' : 'transparent',
          color: sel ? C.amber : isBroken ? C.danger : C.textMuted,
          cursor: 'pointer',
          transition: 'all .18s',
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 300,
          letterSpacing: '0.06em',
          userSelect: 'none',
        }}
      >
        <Icon size={12} style={{ flexShrink: 0, opacity: sel ? 1 : 0.5 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {section.title || 'Untitled Section'}
        </span>
        {isBroken && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.danger, flexShrink: 0 }} />}
      </div>
      {section.subsections?.map(s => renderChildren(s))}
    </div>
  );
});
SidebarItem.displayName = 'SidebarItem';

/* ─────────────────────────────────────────────────────────────
   Block editor card
───────────────────────────────────────────────────────────── */
const BlockCard: React.FC<{
  block: Block;
  onUpdate: (b: Block) => void;
  onRemove: () => void;
}> = React.memo(({ block, onUpdate, onRemove }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    paragraph: <Type size={12} />,
    list:      <ListIcon size={12} />,
    warning:   <AlertTriangle size={12} />,
    quote:     <QuoteIcon size={12} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }}
      style={{
        border: `1px solid ${C.border}`,
        background: C.amberDim,
        marginBottom: 8,
        padding: '14px 16px',
        position: 'relative',
      }}
    >
      {/* left type accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: C.border }} />

      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.amberL }}>
          {typeIcons[block.type] ?? <Layout size={12} />}
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
            {block.type}
          </span>
        </div>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, display: 'flex', alignItems: 'center', transition: 'color .2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = C.danger)}
          onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
        >
          <X size={12} />
        </button>
      </div>

      {/* editors */}
      {block.type === 'paragraph' && (
        <textarea
          value={(block.data as ParagraphData).text}
          onChange={e => onUpdate({ ...block, data: { ...block.data, text: e.target.value } as ParagraphData })}
          style={{ ...baseInput, minHeight: 100 }}
          placeholder="Start typing paragraph content..."
          onFocus={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.background = 'rgba(200,134,10,.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.amberDim; }}
        />
      )}

      {block.type === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={(block.data as ListData).ordered}
              onChange={e => onUpdate({ ...block, data: { ...block.data, ordered: e.target.checked } as ListData })}
              style={{ accentColor: C.amber }}
            />
            <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMid, fontFamily: "'DM Mono', monospace" }}>Ordered list</span>
          </label>
          <textarea
            value={(block.data as ListData).items?.join('\n') || ''}
            onChange={e => onUpdate({ ...block, data: { ...block.data, items: e.target.value.split('\n') } as ListData })}
            style={{ ...baseInput, minHeight: 88 }}
            placeholder="One item per line..."
            onFocus={e => { e.currentTarget.style.borderColor = C.borderHi; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>
      )}

      {(block.type === 'warning' || block.type === 'quote') && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: block.type === 'warning' ? C.danger : C.amber }} />
          <textarea
            value={(block.data as QuoteData | WarningData).text}
            onChange={e => onUpdate({ ...block, data: { ...block.data, text: e.target.value } as QuoteData | WarningData })}
            style={{
              ...baseInput,
              paddingLeft: 18,
              minHeight: 80,
              background: block.type === 'warning' ? C.dangerDim : C.amberDim,
              borderColor: block.type === 'warning' ? C.dangerBorder : C.border,
            }}
            placeholder={`${block.type.charAt(0).toUpperCase() + block.type.slice(1)} text...`}
            onFocus={e => { e.currentTarget.style.borderColor = block.type === 'warning' ? C.danger : C.borderHi; }}
            onBlur={e => { e.currentTarget.style.borderColor = block.type === 'warning' ? C.dangerBorder : C.border; }}
          />
        </div>
      )}

      {!['paragraph','list','warning','quote'].includes(block.type) && (
        <p style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', fontFamily: "'DM Mono', monospace" }}>
          Advanced editing for <em>{block.type}</em> blocks available in LaTeX mode.
        </p>
      )}
    </motion.div>
  );
});
BlockCard.displayName = 'BlockCard';

/* ─────────────────────────────────────────────────────────────
   Add-block strip
───────────────────────────────────────────────────────────── */
const AddBlockStrip = ({ sectionId, addBlock }: { sectionId: string; addBlock: (sectionId: string, block: Block) => void }) => {
  const btns = [
    { label: 'Paragraph', type: 'paragraph', icon: <Type size={11} />, data: { text: '', citations: [] } },
    { label: 'List',      type: 'list',      icon: <ListIcon size={11} />, data: { items: [], ordered: false } },
    { label: 'Quote',     type: 'quote',     icon: <QuoteIcon size={11} />, data: { text: '', source_refs: [] } },
    { label: 'Warning',   type: 'warning',   icon: <AlertTriangle size={11} />, data: { text: '' } },
  ];
  return (
    <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 24, paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textMuted, fontFamily: "'DM Mono', monospace", width: '100%', marginBottom: 4 }}>Add block</span>
      {btns.map(b => (
        <button
          key={b.type}
          onClick={() => addBlock(sectionId, { type: b.type as BlockType, id: crypto.randomUUID(), data: b.data })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: C.amberDim,
            border: `1px solid ${C.border}`,
            color: C.textMid,
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all .18s', borderRadius: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.amber; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
        >
          {b.icon}{b.label}
        </button>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Divider (resize handle)
───────────────────────────────────────────────────────────── */
const ResizeDivider = () => (
  <PanelResizeHandle style={{ width: 1, background: C.border, cursor: 'col-resize', zIndex: 10, transition: 'background .2s' }} />
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
interface ASTEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAST?: DocumentAST;
  onSave?: (ast: DocumentAST) => void;
  onCompile?: (ast: DocumentAST) => Promise<Blob>;
}

export const ASTEditorModal: React.FC<ASTEditorModalProps> = ({
  isOpen, onClose, initialAST, onSave, onCompile,
}) => {
  const {
    document, selectedSectionId, isDirty,
    setDocument, selectSection,
    updateSectionTitle, updateBlock, removeBlock, addBlock,
    updateTitle, updateAbstract, getSection,
  } = useASTStore();

  const [isCompiling,           setIsCompiling]           = useState(false);
  const [compileError,          setCompileError]          = useState<string | null>(null);
  const [pdfPreviewUrl,         setPdfPreviewUrl]         = useState<string | null>(null);
  const [viewMode,              setViewMode]              = useState<'visual' | 'code'>('visual');
  const [latexSource,           setLatexSource]           = useState('');
  const [isFetchingLatex,       setIsFetchingLatex]       = useState(false);
  const [strictMode,            setStrictMode]            = useState(true);
  const [validationIssues,      setValidationIssues]      = useState<ValidationIssue[]>([]);
  const [brokenSectionIds,      setBrokenSectionIds]      = useState<string[]>([]);
  const [showValidation,        setShowValidation]        = useState(false);
  const [lastCompileStats,      setLastCompileStats]      = useState<{ time: string; errors: number } | null>(null);
  const [detailedErrors,        setDetailedErrors]        = useState<{ line: number; message: string }[]>([]);
  const [isInitializing,        setIsInitializing]        = useState(false);
  const [initError,             setInitError]             = useState<string | null>(null);

  React.useEffect(() => {
    const init = async () => {
      if (!isOpen) return;
      if (!document && !initialAST) { 
        setIsInitializing(true); 
        setInitError('No document provided. Please generate a report first.');
        return; 
      }
      if (initialAST) {
        setIsInitializing(true); setInitError(null);
        setDocument(initialAST);
        try {
          const r = await synthesisApi.getLatexFromAST(initialAST);
          setLatexSource(r.latex || '% No LaTeX generated');
        } catch { /* non-blocking */ }
        finally { setIsInitializing(false); }
      }
    };
    init();
  }, [initialAST, isOpen, setDocument, document]);

  const selectedSection = selectedSectionId ? getSection(selectedSectionId) : null;

  const handleValidate = useCallback(async () => {
    if (!document) return;
    try {
      const r = await synthesisApi.validateAST(document);
      setValidationIssues(r.issues);
      return r;
    } catch { return { valid: false, issues: [] }; }
  }, [document]);

  const handleCompile = useCallback(async (ignoreValidation = false) => {
    if (!document && viewMode !== 'code') return;
    if (viewMode === 'visual' && !ignoreValidation) {
      const r = await handleValidate();
      if (r && !r.valid) { setShowValidation(true); return; }
    }
    setIsCompiling(true); setCompileError(null); setBrokenSectionIds([]);
    const t0 = Date.now();
    try {
      const blob = viewMode === 'code'
        ? await synthesisApi.compileRawLatex(latexSource, strictMode)
        : await synthesisApi.generatePdfFromAST(document, strictMode);
      setDetailedErrors([]);
      setPdfPreviewUrl(URL.createObjectURL(blob));
      setLastCompileStats({ time: ((Date.now() - t0) / 1000).toFixed(1) + 's', errors: 0 });
      setShowValidation(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        const d = JSON.parse(msg);
        setCompileError(d.errors?.[0]?.message || d.message || 'Compilation failed');
        setDetailedErrors((d.errors || []).map((e: { line?: number; message: string }) => {
          let line = e.line;
          if (!line) { const m = e.message?.match(/[Ll]ine\s+(\d+)/); if (m) line = +m[1]; }
          return { ...e, line };
        }));
        if (d.broken_sections) setBrokenSectionIds(d.broken_sections.map((s: { id: string }) => s.id));
        setLastCompileStats({ time: ((Date.now() - t0) / 1000).toFixed(1) + 's', errors: (d.errors || []).length });
      } catch { setCompileError('Compilation failed. Try LaTeX mode.'); }
    } finally { setIsCompiling(false); }
  }, [document, viewMode, latexSource, strictMode, handleValidate]);

  const handleModeChange = async (mode: 'visual' | 'code') => {
    if (mode === 'code' && viewMode === 'visual') {
      setIsFetchingLatex(true);
      try {
        const r = await synthesisApi.getLatexFromAST(document);
        setLatexSource(r.latex || '% No LaTeX generated');
        setCompileError(null);
      } catch { setLatexSource('% Error fetching LaTeX'); }
      finally { setIsFetchingLatex(false); }
    }
    setViewMode(mode);
  };

  const handleResetToAST = async () => {
    if (!window.confirm('Discard manual LaTeX edits and regenerate from AST?')) return;
    setIsFetchingLatex(true);
    try {
      const r = await synthesisApi.getLatexFromAST(document);
      setLatexSource(r.latex || ''); setCompileError(null);
    } catch { alert('Failed to regenerate LaTeX'); }
    finally { setIsFetchingLatex(false); }
  };

  const handleDownload = useCallback(() => {
    if (!pdfPreviewUrl || !document) return;
    const a = window.document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `${document.title.replace(/\s+/g, '_')}.pdf`;
    a.click();
  }, [pdfPreviewUrl, document]);

  const handleSave = useCallback(() => {
    if (document && onSave) { onSave(document); onClose(); }
  }, [document, onSave, onClose]);

  const handleClose = useCallback(() => {
    setPdfPreviewUrl(null); setCompileError(null);
    setDetailedErrors([]); setLastCompileStats(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  /* ── layout tokens ── */
  const TOPBAR_H = 52;
  const STATUSBAR_H = 34;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(10,9,6,.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      {/* global keyframes */}
      <style>{`
        @keyframes cog-rspin { to { transform: rotate(360deg); } }
        @keyframes cog-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes cog-sweep { to { left: 140%; } }
        @keyframes cog-scan  { from{top:0} to{top:100%} }
        @keyframes cog-fdot  { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.6);opacity:1} }
        .cog-tab { font-family:'DM Mono',monospace; font-size:10px; font-weight:300; letter-spacing:.14em; text-transform:uppercase; padding:10px 18px; cursor:pointer; background:none; border:none; border-bottom:2px solid transparent; transition:all .2s; }
        .cog-tab:hover { color: #c8860a; }
        .cog-tab.active { color:#c8860a; border-bottom-color:#c8860a; background:rgba(200,134,10,.06); }
        .cog-tab:not(.active) { color: rgba(240,236,224,.4); }
        *:focus-visible { outline: 1px solid rgba(200,134,10,.5); outline-offset: 2px; }
      `}</style>

      <div
        style={{
          width: '96vw', height: '92vh',
          background: C.paper,
          border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* corner brackets */}
        {(['tl','tr','bl','br'] as const).map(pos => (
          <span key={pos} style={{
            position: 'absolute', width: 10, height: 10,
            borderStyle: 'solid', borderColor: C.borderHi, zIndex: 10,
            ...(pos === 'tl' ? { top:0, left:0,  borderWidth:'1.5px 0 0 1.5px' } :
                pos === 'tr' ? { top:0, right:0, borderWidth:'1.5px 1.5px 0 0' } :
                pos === 'bl' ? { bottom:0, left:0,  borderWidth:'0 0 1.5px 1.5px' } :
                               { bottom:0, right:0, borderWidth:'0 1.5px 1.5px 0' }),
          }} />
        ))}

        {/* ── LOADING / ERROR STATE ── */}
        {(isInitializing || (!document && isOpen)) ? (
          <div style={{ flex: 1, position: 'relative' }}>
            <LoadingOverlay label={initError ?? 'Initialising editor...'} />
            {initError && (
              <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}>
                <CogBtn onClick={onClose} variant="ghost">Close</CogBtn>
              </div>
            )}
          </div>
        ) : !document ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <AlertCircle size={40} style={{ color: C.danger, opacity: .5 }} />
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: C.text }}>Document Not Found</p>
            <CogBtn onClick={onClose} variant="primary">Back to Canvas</CogBtn>
          </div>
        ) : (
          <>
            {/* ── TOP BAR ── */}
            <div style={{
              height: TOPBAR_H,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px',
              background: C.surface,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0, position: 'relative',
            }}>
              {/* amber sweep accent */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: C.border, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: '-30%', width: '30%', height: '100%', background: 'rgba(255,210,100,.4)', animation: 'cog-sweep 3s cubic-bezier(.4,0,.6,1) infinite' }} />
              </div>

              {/* left: logo + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, border: `1px solid ${C.borderHi}`, background: C.amberDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill={C.amber} />
                    <circle cx="4"  cy="6"  r="2" fill="rgba(200,134,10,.5)" />
                    <circle cx="20" cy="6"  r="2" fill="rgba(200,134,10,.5)" />
                    <circle cx="4"  cy="18" r="2" fill="rgba(200,134,10,.5)" />
                    <circle cx="20" cy="18" r="2" fill="rgba(200,134,10,.5)" />
                    <line x1="6"  y1="7"  x2="10" y2="11" stroke="rgba(200,134,10,.4)" strokeWidth="1.2" />
                    <line x1="18" y1="7"  x2="14" y2="11" stroke="rgba(200,134,10,.4)" strokeWidth="1.2" />
                    <line x1="6"  y1="17" x2="10" y2="13" stroke="rgba(200,134,10,.4)" strokeWidth="1.2" />
                    <line x1="18" y1="17" x2="14" y2="13" stroke="rgba(200,134,10,.4)" strokeWidth="1.2" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-.01em', lineHeight: 1 }}>
                    Document Editor
                    {isDirty && <span style={{ marginLeft: 8, color: C.amber, fontSize: 10 }}>●</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.textMuted, marginTop: 2 }}>
                    AST · Visual + LaTeX
                  </div>
                </div>
              </div>

              {/* right: actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* strict mode toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginRight: 8 }}>
                  <input type="checkbox" checked={strictMode} onChange={e => setStrictMode(e.target.checked)} style={{ accentColor: C.amber }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: strictMode ? C.amberL : C.textMuted }}>
                    Strict
                  </span>
                </label>
                <CogBtn onClick={handleValidate} title="Validate AST structure">
                  <Check size={12} /> Validate
                </CogBtn>
                <CogBtn variant="primary" onClick={() => handleCompile()} disabled={isCompiling}>
                  <Zap size={12} style={{ animation: isCompiling ? 'cog-pulse 1s infinite' : 'none' }} />
                  {isCompiling ? 'Compiling...' : 'Recompile'}
                </CogBtn>
                {pdfPreviewUrl && (
                  <CogBtn onClick={handleDownload}>
                    <Download size={12} /> PDF
                  </CogBtn>
                )}
                <CogBtn variant="primary" onClick={handleSave}>
                  <Save size={12} /> Save
                </CogBtn>
                <CogBtn variant="danger" onClick={handleClose}>
                  <X size={12} /> Close
                </CogBtn>
              </div>
            </div>

            {/* ── THREE-PANE BODY ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
              <AnimatePresence>
                {showValidation && (
                  <ValidationPanel
                    issues={validationIssues}
                    onClose={() => setShowValidation(false)}
                    onProceed={() => handleCompile(true)}
                  />
                )}
              </AnimatePresence>

              <PanelGroup direction="horizontal">

                {/* ── LEFT: OUTLINE TREE ── */}
                <Panel defaultSize={18} minSize={14}>
                  <div style={{
                    height: '100%', overflow: 'auto',
                    background: C.raised,
                    borderRight: `1px solid ${C.border}`,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    {/* pane label */}
                    <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textMuted }}>Structure</span>
                    </div>

                    {/* document root */}
                    <div
                      onClick={() => selectSection(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px',
                        borderLeft: `2px solid ${selectedSectionId === null ? C.amber : 'transparent'}`,
                        background: selectedSectionId === null ? C.amberDim : 'transparent',
                        color: selectedSectionId === null ? C.amber : C.textMid,
                        cursor: 'pointer', transition: 'all .18s',
                        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 300, letterSpacing: '0.06em',
                      }}
                    >
                      <Layout size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {document?.title || 'Untitled Report'}
                      </span>
                    </div>

                    {/* section tree */}
                    {(() => {
                      const renderSection = (s: Section): React.ReactNode => (
                        <SidebarItem
                          key={s.id} section={s}
                          selectedId={selectedSectionId}
                          isBroken={brokenSectionIds.includes(s.id)}
                          onSelect={selectSection}
                          renderChildren={renderSection}
                        />
                      );
                      return document?.sections.map(renderSection);
                    })()}
                  </div>
                </Panel>

                <ResizeDivider />

                {/* ── CENTRE: EDITOR ── */}
                <Panel defaultSize={45} minSize={28}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.surface }}>

                    {/* tabs */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.raised, flexShrink: 0, padding: '0 8px' }}>
                      <button className={`cog-tab${viewMode === 'visual' ? ' active' : ''}`} onClick={() => setViewMode('visual')}>
                        Visual Editor
                      </button>
                      <button className={`cog-tab${viewMode === 'code' ? ' active' : ''}`} onClick={() => handleModeChange('code')}>
                        LaTeX Source
                      </button>
                      {viewMode === 'code' && (
                        <button
                          className="cog-tab"
                          style={{ marginLeft: 'auto', color: `${C.danger} !important` }}
                          onClick={handleResetToAST}
                        >
                          <RotateCcw size={10} style={{ marginRight: 5 }} />
                          Reset to AST
                        </button>
                      )}
                    </div>

                    {/* editor body */}
                    <div style={{ flex: 1, minHeight: 0, overflow: viewMode === 'code' ? 'hidden' : 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <AnimatePresence mode="wait">
                        {viewMode === 'code' ? (
                          <motion.div key="code" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {isFetchingLatex ? (
                              <LoadingOverlay label="Generating LaTeX..." />
                            ) : (
                              <>
                                <div style={{
                                  flexShrink: 0, padding: '10px 16px',
                                  background: C.amberDim,
                                  borderBottom: `1px solid ${C.border}`,
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.amberL,
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, animation: 'cog-pulse 2s infinite' }} />
                                  Advanced Safety Mode · Manual edits are validated for compilation safety
                                </div>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                  <LatexCodeEditor value={latexSource} onChange={setLatexSource} errors={detailedErrors} />
                                </div>
                              </>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div
                            key={selectedSectionId ?? 'root'}
                            initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
                            transition={{ type:'spring', damping:28, stiffness:300 }}
                            style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '24px 28px' }}
                          >
                            {/* ── Document root editing ── */}
                            {selectedSectionId === null && document && (
                              <div>
                                <div style={{ marginBottom: 22, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                                  <label style={LABEL_STYLE}>Document Title</label>
                                  <input
                                    type="text"
                                    value={document.title}
                                    onChange={e => updateTitle(e.target.value)}
                                    style={{ ...baseInput, fontSize: 20, fontFamily: "'Playfair Display',serif", fontWeight: 700, letterSpacing: '-.02em', padding: '8px 0', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, resize: 'none' }}
                                    onFocus={e => e.currentTarget.style.borderBottomColor = C.borderHi}
                                    onBlur={e => e.currentTarget.style.borderBottomColor = C.border}
                                  />
                                </div>
                                <div>
                                  <label style={LABEL_STYLE}>Abstract / Executive Summary</label>
                                  <textarea
                                    value={document.abstract}
                                    onChange={e => updateAbstract(e.target.value)}
                                    style={{ ...baseInput, minHeight: 220, fontSize: 13, background: 'transparent', border: 'none', padding: 0, resize: 'none', lineHeight: 1.85 }}
                                    placeholder="Describe the main findings of your research..."
                                    onFocus={e => e.currentTarget.style.borderBottomColor = C.borderHi}
                                    onBlur={e => e.currentTarget.style.borderBottomColor = C.border}
                                  />
                                </div>
                              </div>
                            )}

                            {/* ── Section editing ── */}
                            {selectedSection && (
                              <div>
                                <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: `2px solid ${C.border}`, borderLeft: `3px solid ${C.amber}`, paddingLeft: 16 }}>
                                  <label style={LABEL_STYLE}>Section Heading</label>
                                  <input
                                    type="text"
                                    value={selectedSection.title}
                                    onChange={e => updateSectionTitle(selectedSection.id, e.target.value)}
                                    style={{ ...baseInput, fontSize: 17, fontFamily: "'Playfair Display',serif", fontWeight: 700, letterSpacing: '-.01em', background: 'transparent', border: 'none', padding: '4px 0', resize: 'none' }}
                                    onFocus={e => e.currentTarget.style.opacity = '1'}
                                  />
                                </div>
                                <AnimatePresence initial={false}>
                                  {selectedSection.content.map(block => (
                                    <BlockCard
                                      key={block.id} block={block}
                                      onUpdate={data => updateBlock(selectedSection.id, block.id, data)}
                                      onRemove={() => removeBlock(selectedSection.id, block.id)}
                                    />
                                  ))}
                                </AnimatePresence>
                                <AddBlockStrip sectionId={selectedSection.id} addBlock={addBlock} />
                              </div>
                            )}

                            {/* ── Empty state ── */}
                            {!selectedSection && selectedSectionId !== null && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14, color: C.textMuted }}>
                                <Layout size={28} style={{ opacity: .3 }} />
                                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  Select a section to edit
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Panel>

                <ResizeDivider />

                {/* ── RIGHT: PREVIEW ── */}
                <Panel defaultSize={37} minSize={18}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.raised, borderLeft: `1px solid ${C.border}` }}>
                    {/* pane label */}
                    <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textMuted }}>PDF Preview</span>
                      {pdfPreviewUrl && (
                        <button
                          onClick={handleDownload}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color .2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = C.amber}
                          onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
                        >
                          <Download size={11} /> Download
                        </button>
                      )}
                    </div>

                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                      {isCompiling ? (
                        <LoadingOverlay label="Compiling LaTeX..." />
                      ) : compileError ? (
                        <div style={{
                          margin: 18, padding: '16px 18px',
                          border: `1px solid ${C.dangerBorder}`,
                          background: C.dangerDim,
                          borderLeft: `3px solid ${C.danger}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: C.danger }}>
                            <AlertTriangle size={14} />
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 400 }}>Compilation Error</span>
                          </div>
                          <pre style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.textMid, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(0,0,0,.25)', padding: '10px 12px', overflowX: 'auto', border: `1px solid ${C.border}` }}>
                            {compileError}
                          </pre>
                          <p style={{ marginTop: 10, fontFamily: "'DM Mono',monospace", fontSize: 10, color: C.textMuted, letterSpacing: '0.08em' }}>
                            Check LaTeX syntax or switch to code mode.
                          </p>
                        </div>
                      ) : pdfPreviewUrl ? (
                        <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: C.textMuted }}>
                          <Zap size={24} style={{ opacity: .25 }} />
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            Press Recompile to preview
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>

              </PanelGroup>
            </div>

            {/* ── STATUS BAR ── */}
            <div style={{
              height: STATUSBAR_H,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px',
              background: C.surface,
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
              fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: isDirty ? C.amberL : 'rgba(80,180,100,.8)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {isDirty ? 'Unsaved changes' : 'All saved'}
                </span>
                {strictMode && (
                  <span style={{ padding: '2px 7px', background: C.amberDim, border: `1px solid ${C.border}`, color: C.amberL }}>
                    Strict mode
                  </span>
                )}
              </div>
              <div style={{ color: C.textMuted }}>
                {lastCompileStats && (
                  <>
                    Last compile: <strong style={{ color: C.textMid }}>{lastCompileStats.time}</strong>
                    {lastCompileStats.errors > 0 && (
                      <span style={{ marginLeft: 10, color: C.danger }}>
                        {lastCompileStats.errors} error{lastCompileStats.errors !== 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ASTEditorModal;
