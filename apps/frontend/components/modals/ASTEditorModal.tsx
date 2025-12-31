/**
 * AST Editor Modal — Three-Pane Document AST Editor
 * 
 * Provides a visual editor for the AI-generated document AST with:
 * - Outline Tree (navigation)
 * - Section Editor (form-based editing)
 * - Live Preview (rendered output)
 */
import React, { useState, useCallback } from 'react';
import { useASTStore, DocumentAST, Section, Block } from '../../store/ast.store';
import { synthesisApi, ValidationIssue } from '../../lib/api';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import LatexCodeEditor from '../ui/LatexCodeEditor';
import {
    FileText,
    ChevronRight,
    ChevronDown,
    Book,
    File,
    Check,
    Save,
    Download,
    X,
    AlertTriangle,
    Zap,
    Layout,
    Type,
    List as ListIcon,
    Quote as QuoteIcon,
    Settings,
    Eye
} from 'lucide-react';


// ============================================================
// STYLES
// ============================================================

const styles = {
    overlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 5, 15, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
    },
    modal: {
        width: '96vw',
        height: '92vh',
        backgroundColor: '#0f0f1a',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    },
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        backgroundColor: '#131325',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    },
    topBarTitle: {
        fontSize: '15px',
        fontWeight: 600,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    topBarButtons: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    button: {
        padding: '7px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    primaryButton: {
        backgroundColor: '#4f46e5',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#d1d1e0',
        border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    dangerButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    mainContent: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    pane: {
        overflow: 'auto',
    },
    outlinePane: {
        backgroundColor: '#0c0c16',
        padding: '16px',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    },
    editorPane: {
        backgroundColor: '#0f0f1a',
        padding: '0px',
    },
    previewPane: {
        backgroundColor: '#05050a',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        backgroundColor: '#131325',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '11px',
        color: '#71717a',
    },
    statusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    resizeHandle: {
        width: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        cursor: 'col-resize',
        transition: 'all 0.2s',
        zIndex: 10,
    },
    tabButton: {
        padding: '12px 20px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#71717a',
        borderBottom: '2px solid transparent',
        transition: 'all 0.2s',
    },
    activeTab: {
        color: '#fff',
        borderBottom: '2px solid #4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
    },
    loadingOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 10, 20, 0.8)',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        backdropFilter: 'blur(4px)',
    },
    spinner: {
        width: '32px',
        height: '32px',
        border: '3px solid rgba(79, 70, 229, 0.2)',
        borderTop: '3px solid #4f46e5',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '16px',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '16px',
        transition: 'all 0.2s',
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        transition: 'all 0.2s',
        outline: 'none',
    },
    label: {
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: '#71717a',
        marginBottom: '8px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
    }
};

const LoadingSpinner = ({ label }: { label?: string }) => (
    <div style={styles.loadingOverlay}>
        <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}</style>
        <div style={styles.spinner}></div>
        {label && <div style={{ color: '#ccc', fontSize: '14px' }}>{label}</div>}
    </div>
);

const ValidationChecklist = ({
    issues,
    onClose,
    onProceed
}: {
    issues: ValidationIssue[],
    onClose: () => void,
    onProceed: () => void
}) => {
    const critical = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');

    return (
        <div style={styles.loadingOverlay}>
            <div style={{
                width: '400px',
                backgroundColor: '#1a1a2e',
                borderRadius: '12px',
                border: '1px solid #3a3a5a',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
                <h3 style={{ marginTop: 0, color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {critical.length > 0 ? '&#128308;' : '&#128993;'} Pre-compile Check
                </h3>

                <p style={{ fontSize: '14px', color: '#888' }}>
                    {critical.length > 0
                        ? 'The following critical issues must be fixed before compilation:'
                        : 'Review these warnings before proceeding:'}
                </p>

                <div style={{ maxHeight: '250px', overflow: 'auto', marginBottom: '20px' }}>
                    {critical.map((issue, i) => (
                        <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>{issue.location}</div>
                            <div style={{ fontSize: '13px', color: '#fff' }}>{issue.message}</div>
                        </div>
                    ))}
                    {warnings.map((issue, i) => (
                        <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid #eab308', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#eab308', textTransform: 'uppercase', fontWeight: 600 }}>{issue.location}</div>
                            <div style={{ fontSize: '13px', color: '#fff' }}>{issue.message}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={onClose}
                    >
                        Fix Issues
                    </button>
                    {critical.length === 0 && (
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={onProceed}
                        >
                            Proceed Anyway
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const SidebarSection: React.FC<{
    section: Section;
    selectedId: string | null;
    isBroken: boolean;
    onSelect: (id: string) => void;
    renderChildren: (section: Section) => React.ReactNode;
}> = ({ section, selectedId, isBroken, onSelect, renderChildren }) => {
    const isSelected = selectedId === section.id;

    return (
        <div style={{ marginBottom: '2px' }}>
            <div
                onClick={() => onSelect(section.id)}
                style={{
                    padding: '8px 12px',
                    paddingLeft: `${section.level * 12 + 12}px`,
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                    color: isSelected ? '#fff' : isBroken ? '#ef4444' : '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderLeft: isSelected ? '2px solid #4f46e5' : '2px solid transparent',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', opacity: isSelected ? 1 : 0.7 }}>
                    {section.level === 1 ? <Book size={14} /> : section.level === 2 ? <FileText size={14} /> : <File size={14} />}
                </div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {section.title || 'Untitled Section'}
                </span>
                {isBroken && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
            </div>
            {section.subsections && section.subsections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {section.subsections.map(sub => renderChildren(sub))}
                </div>
            )}
        </div>
    );
};

interface BlockEditorProps {
    block: Block;
    onUpdate: (block: Block) => void;
    onRemove: () => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ block, onUpdate, onRemove }) => {
    const renderIcon = () => {
        switch (block.type) {
            case 'paragraph': return <Type size={14} />;
            case 'list': return <ListIcon size={14} />;
            case 'warning': return <AlertTriangle size={14} />;
            case 'quote': return <QuoteIcon size={14} />;
            default: return <Layout size={14} />;
        }
    };

    const renderEditor = () => {
        switch (block.type) {
            case 'paragraph':
                return (
                    <textarea
                        value={(block.data as any).text}
                        onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
                        style={styles.input}
                        rows={4}
                        placeholder="Start typing your paragraph content..."
                    />
                );
            case 'list':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={(block.data as any).ordered}
                                onChange={(e) => onUpdate({ ...block, data: { ...block.data, ordered: e.target.checked } })}
                            />
                            <span style={{ fontSize: '12px', color: '#71717a' }}>Ordered List</span>
                        </div>
                        <textarea
                            value={(block.data as any).items?.join('\n') || ''}
                            onChange={(e) => onUpdate({ ...block, data: { ...block.data, items: e.target.value.split('\n') } })}
                            placeholder="One item per line..."
                            style={styles.input}
                            rows={3}
                        />
                    </div>
                );
            case 'warning':
            case 'quote':
                return (
                    <textarea
                        value={(block.data as any).text}
                        onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
                        placeholder={`${block.type.charAt(0).toUpperCase() + block.type.slice(1)} content...`}
                        style={{ ...styles.input, backgroundColor: block.type === 'warning' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(79, 70, 229, 0.05)' }}
                        rows={2}
                    />
                );
            default:
                return <div style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic' }}>Editing for {block.type} blocks is available in Code Mode.</div>;
        }
    };

    return (
        <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a' }}>
                    {renderIcon()}
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{block.type}</span>
                </div>
                <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}>
                    <X size={14} />
                </button>
            </div>
            {renderEditor()}
        </div>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface ASTEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAST?: DocumentAST;
    onSave?: (ast: DocumentAST) => void;
    onCompile?: (ast: DocumentAST) => Promise<Blob>;
}

export const ASTEditorModal: React.FC<ASTEditorModalProps> = ({
    isOpen,
    onClose,
    initialAST,
    onSave,
    onCompile,
}) => {
    const {
        document,
        selectedSectionId,
        validationStatus,
        isDirty,
        setDocument,
        selectSection,
        updateSectionTitle,
        updateBlock,
        removeBlock,
        addBlock,
        updateTitle,
        updateAbstract,
        validate,
        getSection,
    } = useASTStore();

    const [isCompiling, setIsCompiling] = useState(false);
    const [compileError, setCompileError] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [latexSource, setLatexSource] = useState<string>('');
    const [isFetchingLatex, setIsFetchingLatex] = useState(false);
    const [strictMode, setStrictMode] = useState(true);
    const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
    const [brokenSectionIds, setBrokenSectionIds] = useState<string[]>([]);
    const [showValidationChecklist, setShowValidationChecklist] = useState(false);
    const [lastCompileStats, setLastCompileStats] = useState<{ time: string, errors: number } | null>(null);
    const [detailedErrors, setDetailedErrors] = useState<{ line: number; message: string; context?: string }[]>([]);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    // Initialize document and pre-fetch LaTeX
    React.useEffect(() => {
        const init = async () => {
            if (initialAST && isOpen) {
                setIsInitializing(true);
                setInitError(null);
                setDocument(initialAST);

                try {
                    // Pre-fetch LaTeX to ensure code editor is ready when toggled
                    const result = await synthesisApi.getLatexFromAST(initialAST);
                    setLatexSource(result.latex || '% No LaTeX generated');
                } catch (err: any) {
                    console.error("Failed to initialize LaTeX:", err);
                    setInitError("Failed to prepare document editor. Please try again.");
                } finally {
                    setIsInitializing(false);
                }
            }
        };
        init();
    }, [initialAST, isOpen, setDocument]);

    const selectedSection = selectedSectionId ? getSection(selectedSectionId) : null;

    const handleValidate = useCallback(async () => {
        if (!document) return;
        try {
            const result = await synthesisApi.validateAST(document);
            setValidationIssues(result.issues);
            return result;
        } catch (err) {
            console.error("Validation failed:", err);
            return { valid: false, issues: [] };
        }
    }, [document]);

    const handleCompile = useCallback(async (ignoreValidation = false) => {
        if (!document && viewMode === 'visual') return;

        // 1. Pre-compile Validation (if in visual mode and not ignored)
        if (viewMode === 'visual' && !ignoreValidation) {
            const result = await handleValidate();
            if (result && !result.valid) {
                setShowValidationChecklist(true);
                return; // Block compile on critical errors
            }
        }

        setIsCompiling(true);
        setCompileError(null);
        setBrokenSectionIds([]);
        const startTime = Date.now();

        try {
            let blob: Blob;

            if (viewMode === 'code') {
                // Compile from raw LaTeX
                blob = await synthesisApi.compileRawLatex(latexSource, strictMode);
            } else {
                // Compile from AST (Standard)
                blob = await synthesisApi.generatePdfFromAST(document, strictMode);
            }

            setDetailedErrors([]); // Clear errors on success
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setLastCompileStats({
                time: ((Date.now() - startTime) / 1000).toFixed(1) + 's',
                errors: 0
            });
            setShowValidationChecklist(false);
        } catch (err: any) {
            // Handle structured error
            try {
                const errorData = JSON.parse(err.message);
                if (errorData.errors) {
                    setCompileError(errorData.message || 'Compilation failed');

                    // Parse line numbers from error messages if needed for inline highlighting
                    const parsedErrors = errorData.errors.map((e: any) => {
                        let line = e.line;
                        if (line === 0 || !line) {
                            const match = e.message.match(/Line (\d+):/);
                            if (match) line = parseInt(match[1], 10);
                        }
                        return { ...e, line };
                    });
                    setDetailedErrors(parsedErrors);

                    // If we have broken sections from isolation
                    if (errorData.broken_sections) {
                        setBrokenSectionIds(errorData.broken_sections.map((s: any) => s.id));
                    }
                    setLastCompileStats({
                        time: ((Date.now() - startTime) / 1000).toFixed(1) + 's',
                        errors: errorData.errors.length
                    });
                } else {
                    setCompileError(err.message);
                }
            } catch (error) {
                setCompileError('Analysis failed. Manual LaTeX editing suggested.');
            }
        } finally {
            setIsCompiling(false);
        }
    }, [document, viewMode, latexSource, strictMode, handleValidate]);

    const handleModeChange = async (mode: 'visual' | 'code') => {
        if (mode === 'code' && viewMode === 'visual') {
            // Fetch LaTeX when switching to code view
            try {
                setIsFetchingLatex(true);
                const result = await synthesisApi.getLatexFromAST(document);
                setLatexSource(result.latex || '% No LaTeX generated');
                setCompileError(null);
            } catch (err) {
                console.error("Failed to fetch LaTeX:", err);
                setLatexSource('% Error fetching LaTeX source');
            } finally {
                setIsFetchingLatex(false);
            }
        }
        setViewMode(mode);
    };

    const handleResetToAST = async () => {
        if (window.confirm("Discard manual LaTeX edits and regenerate from AST?")) {
            setIsFetchingLatex(true);
            try {
                const result = await synthesisApi.getLatexFromAST(document);
                setLatexSource(result.latex || '');
                setCompileError(null);
            } catch (err) {
                alert("Failed to regenerate LaTeX");
            } finally {
                setIsFetchingLatex(false);
            }
        }
    };

    const handleDownloadPdf = useCallback(() => {
        if (!pdfPreviewUrl || !document) return;
        const a = window.document.createElement('a');
        a.href = pdfPreviewUrl;
        a.download = `${document.title.replace(/\s+/g, '_')}.pdf`;
        a.click();
    }, [pdfPreviewUrl, document]);

    const handleSave = useCallback(() => {
        if (document && onSave) {
            onSave(document);
            onClose();
        }
    }, [document, onSave, onClose]);

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {isInitializing ? (
                    <div style={styles.loadingOverlay}>
                        <LoadingSpinner label="Initializing editor..." />
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#6a6a8a' }}>
                            Synthesizing LaTeX structure and references
                        </div>
                    </div>
                ) : initError ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#ef4444', fontSize: '24px', marginBottom: '16px' }}>&#9888; Initialization Failed</div>
                        <div style={{ color: '#a5a5c5', marginBottom: '24px' }}>{initError}</div>
                        <button
                            onClick={onClose}
                            style={{
                                ...styles.button,
                                ...styles.secondaryButton,
                                padding: '10px 24px',
                            }}
                        >
                            Back to Canvas
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Top Bar */}
                        <div style={styles.topBar}>
                            <div style={styles.topBarTitle}>
                                <Layout size={18} style={{ marginRight: '10px', color: '#818cf8' }} />
                                Document Editor {isDirty && <span style={{ color: '#fbbf24', marginLeft: '4px' }}>&#9679;</span>}
                            </div>
                            <div style={styles.topBarButtons}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#71717a', cursor: 'pointer', marginRight: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={strictMode}
                                        onChange={(e) => setStrictMode(e.target.checked)}
                                    />
                                    Strict Mode
                                </label>
                                <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleValidate}>
                                    <Check size={14} /> Validate
                                </button>
                                <button style={{ ...styles.button, ...styles.primaryButton }} onClick={() => handleCompile()} disabled={isCompiling}>
                                    {isCompiling ? <Zap size={14} className="animate-pulse" /> : <Zap size={14} />}
                                    {isCompiling ? 'Compiling...' : 'Recompile'}
                                </button>
                                {pdfPreviewUrl && (
                                    <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleDownloadPdf}>
                                        <Download size={14} /> Download
                                    </button>
                                )}
                                <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleSave}>
                                    <Save size={14} /> Save
                                </button>
                                <button style={{ ...styles.button, ...styles.dangerButton }} onClick={onClose}>
                                    <X size={14} /> Close
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div style={{ ...styles.mainContent, position: 'relative' }}>
                            {showValidationChecklist && (
                                <ValidationChecklist
                                    issues={validationIssues}
                                    onClose={() => setShowValidationChecklist(false)}
                                    onProceed={() => handleCompile(true)}
                                />
                            )}
                            <PanelGroup direction="horizontal">
                                {/* Left Pane: Outline Tree */}
                                <Panel defaultSize={20} minSize={15}>
                                    <div style={{ ...styles.pane, ...styles.outlinePane, height: '100%', borderRight: 'none' }}>
                                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STRUCTURE</div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div
                                                onClick={() => selectSection(null)}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    backgroundColor: selectedSectionId === null ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                                    color: selectedSectionId === null ? '#fff' : '#a1a1aa',
                                                    cursor: 'pointer',
                                                    marginBottom: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: selectedSectionId === null ? 600 : 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s',
                                                    borderLeft: selectedSectionId === null ? '2px solid #4f46e5' : '2px solid transparent',
                                                }}
                                            >
                                                <Layout size={16} />
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {document?.title || 'Untitled Report'}
                                                </span>
                                            </div>

                                            {/* Recursive Section Tree */}
                                            {(() => {
                                                const renderSection = (section: Section): React.ReactNode => (
                                                    <SidebarSection
                                                        key={section.id}
                                                        section={section}
                                                        selectedId={selectedSectionId}
                                                        isBroken={brokenSectionIds.includes(section.id)}
                                                        onSelect={selectSection}
                                                        renderChildren={renderSection}
                                                    />
                                                );
                                                return document?.sections.map(renderSection);
                                            })()}
                                        </div>
                                    </div>
                                </Panel>

                                <PanelResizeHandle style={styles.resizeHandle} />

                                {/* Middle Pane: Editor */}
                                <Panel defaultSize={45} minSize={30}>
                                    <div style={{ ...styles.pane, ...styles.editorPane, display: 'flex', flexDirection: 'column', padding: 0, height: '100%', minHeight: 0 }}>
                                        {/* Editor Tabs */}
                                        <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#131325', padding: '0 10px' }}>
                                            <button
                                                style={{ ...styles.tabButton, ...(viewMode === 'visual' ? styles.activeTab : {}) }}
                                                onClick={() => setViewMode('visual')}
                                            >
                                                Visual Editor
                                            </button>
                                            <button
                                                style={{ ...styles.tabButton, ...(viewMode === 'code' ? styles.activeTab : {}) }}
                                                onClick={() => handleModeChange('code')}
                                            >
                                                Code Editor (LaTeX)
                                            </button>
                                            {viewMode === 'code' && (
                                                <button
                                                    style={{ ...styles.tabButton, color: '#f87171', marginLeft: 'auto' }}
                                                    onClick={handleResetToAST}
                                                    title="Discard manual edits and regenerate from AST"
                                                >
                                                    Reset to AST
                                                </button>
                                            )}
                                        </div>

                                        {/* Editor Content */}
                                        <div style={{ flex: 1, minHeight: 0, overflow: viewMode === 'code' ? 'hidden' : 'auto', padding: viewMode === 'code' ? '0' : '24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                            {viewMode === 'code' ? (
                                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                    {isFetchingLatex ? (
                                                        <LoadingSpinner label="Generating LaTeX source..." />
                                                    ) : (
                                                        <>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: '#eab308',
                                                                marginBottom: '10px',
                                                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid rgba(234, 179, 8, 0.3)'
                                                            }}>
                                                                <div style={{ fontWeight: 600, marginBottom: '2px' }}>&#128274; Advanced Safety Mode</div>
                                                                Manual LaTeX edits are isolated and checked for safety. These edits will override the visual structure during compilation.
                                                            </div>
                                                            <div style={{ flex: 1, minHeight: 0 }}>
                                                                <LatexCodeEditor
                                                                    value={latexSource}
                                                                    onChange={setLatexSource}
                                                                    errors={detailedErrors}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {selectedSectionId === null && document ? (
                                                        // Document-level editing
                                                        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={styles.card}>
                                                                <label style={styles.label}>Document Title</label>
                                                                <input
                                                                    type="text"
                                                                    value={document.title}
                                                                    onChange={(e) => updateTitle(e.target.value)}
                                                                    style={{ ...styles.input, fontSize: '20px', fontWeight: 700, backgroundColor: 'transparent', border: 'none', padding: '0 0 10px 0', borderRadius: 0, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
                                                                />
                                                            </div>
                                                            <div style={styles.card}>
                                                                <label style={styles.label}>Abstract</label>
                                                                <textarea
                                                                    value={document.abstract}
                                                                    onChange={(e) => updateAbstract(e.target.value)}
                                                                    style={{ ...styles.input, minHeight: '180px', backgroundColor: 'transparent', border: 'none', padding: 0, resize: 'none', lineHeight: '1.6' }}
                                                                    placeholder="Describe the main findings of your research..."
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : selectedSection ? (
                                                        // Section editing
                                                        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ ...styles.card, borderLeft: '4px solid #4f46e5' }}>
                                                                <label style={styles.label}>Section Heading</label>
                                                                <input
                                                                    type="text"
                                                                    value={selectedSection.title}
                                                                    onChange={(e) => updateSectionTitle(selectedSection.id, e.target.value)}
                                                                    style={{ ...styles.input, fontSize: '18px', fontWeight: 600, border: 'none', backgroundColor: 'transparent', padding: '0 0 8px 0', borderRadius: 0, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
                                                                />
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {selectedSection.content.map((block) => (
                                                                    <BlockEditor
                                                                        key={block.id}
                                                                        block={block}
                                                                        onUpdate={(data) => updateBlock(selectedSection.id, block.id, data)}
                                                                        onRemove={() => removeBlock(selectedSection.id, block.id)}
                                                                    />
                                                                ))}
                                                            </div>

                                                            <div style={{
                                                                marginTop: '24px',
                                                                padding: '16px',
                                                                borderRadius: '12px',
                                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                                border: '1px dashed rgba(255, 255, 255, 0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <button
                                                                    onClick={() => addBlock(selectedSection.id, {
                                                                        type: 'paragraph',
                                                                        id: Math.random().toString(36).substr(2, 9),
                                                                        data: { text: '', citations: [] }
                                                                    })}
                                                                    style={styles.button}
                                                                >
                                                                    <Type size={14} /> Paragraph
                                                                </button>
                                                                <button
                                                                    onClick={() => addBlock(selectedSection.id, {
                                                                        type: 'list',
                                                                        id: Math.random().toString(36).substr(2, 9),
                                                                        data: { items: [], ordered: false }
                                                                    })}
                                                                    style={styles.button}
                                                                >
                                                                    <ListIcon size={14} /> List
                                                                </button>
                                                                <button
                                                                    onClick={() => addBlock(selectedSection.id, {
                                                                        type: 'quote',
                                                                        id: Math.random().toString(36).substr(2, 9),
                                                                        data: { text: '', source_refs: [] }
                                                                    })}
                                                                    style={styles.button}
                                                                >
                                                                    <QuoteIcon size={14} /> Quote
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
                                                            Select a section to edit
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Panel>

                                <PanelResizeHandle style={styles.resizeHandle} />

                                {/* Right Pane: Preview */}
                                <Panel defaultSize={35} minSize={20}>
                                    <div style={{ ...styles.pane, ...styles.previewPane, padding: 0, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                        <div style={{ flexShrink: 0, padding: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#131325' }}>
                                            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>PDF PREVIEW</span>
                                        </div>
                                        <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                            {isCompiling ? (
                                                <LoadingSpinner label="Compiling LaTeX..." />
                                            ) : compileError ? (
                                                <div style={{
                                                    padding: '24px',
                                                    color: '#ef4444',
                                                    fontSize: '14px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                    margin: '20px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    overflow: 'auto'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                                                        <AlertTriangle size={20} />
                                                        <span style={{ fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Compilation Error
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'monospace',
                                                        backgroundColor: 'rgba(0,0,0,0.3)',
                                                        padding: '12px',
                                                        borderRadius: '6px',
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: '1.5',
                                                        border: '1px solid rgba(239, 68, 68, 0.1)'
                                                    }}>
                                                        {compileError}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                                                        Check your LaTeX syntax or safety violations in the code editor.
                                                    </div>
                                                </div>
                                            ) : pdfPreviewUrl ? (
                                                <iframe
                                                    src={pdfPreviewUrl}
                                                    style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
                                                    title="PDF Preview"
                                                />
                                            ) : (
                                                <div style={{ padding: '20px', color: '#888', textAlign: 'center', marginTop: '40px' }}>
                                                    Click &quot;Recompile&quot; to generate preview
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Panel>
                            </PanelGroup>
                        </div>

                        {/* Status Bar */}
                        <div style={styles.statusBar}>
                            <div style={styles.statusItem}>
                                {isDirty ? (
                                    <span style={{ color: '#eab308' }}>&#9679; Unsaved Changes</span>
                                ) : (
                                    <span style={{ color: '#10b981' }}>&#10003; All changes saved</span>
                                )}
                                {strictMode && (
                                    <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: '4px', color: '#818cf8', fontSize: '10px', fontWeight: 600 }}>
                                        STRICT MODE ON
                                    </span>
                                )}
                            </div>
                            <div style={styles.statusItem}>
                                {lastCompileStats && (
                                    <span style={{ color: '#71717a' }}>
                                        Last compile: <b>{lastCompileStats.time}</b>
                                        {lastCompileStats.errors > 0 && <span style={{ color: '#ef4444', marginLeft: '8px' }}>({lastCompileStats.errors} errors)</span>}
                                    </span>
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
