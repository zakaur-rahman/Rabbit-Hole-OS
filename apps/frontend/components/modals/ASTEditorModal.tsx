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
import { synthesisApi } from '../../lib/api';

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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000, // Increased to ensures it's above ReactFlow and other overlays
    },
    modal: {
        width: '95vw',
        height: '90vh',
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
        border: '1px solid #3a3a5a',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: '#16162a',
        borderBottom: '1px solid #3a3a5a',
    },
    topBarTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: '#fff',
    },
    topBarButtons: {
        display: 'flex',
        gap: '10px',
    },
    button: {
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    primaryButton: {
        backgroundColor: '#4f46e5',
        color: '#fff',
    },
    secondaryButton: {
        backgroundColor: '#2a2a4a',
        color: '#ccc',
        border: '1px solid #3a3a5a',
    },
    dangerButton: {
        backgroundColor: '#dc2626',
        color: '#fff',
    },
    mainContent: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    pane: {
        overflow: 'auto',
        borderRight: '1px solid #3a3a5a',
    },
    outlinePane: {
        width: '20%',
        minWidth: '200px',
        backgroundColor: '#12122a',
        padding: '12px',
    },
    editorPane: {
        width: '50%',
        backgroundColor: '#1a1a2e',
        padding: '20px',
    },
    previewPane: {
        width: '30%',
        backgroundColor: '#0d0d1a',
        padding: '20px',
        borderRight: 'none',
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        backgroundColor: '#16162a',
        borderTop: '1px solid #3a3a5a',
        fontSize: '12px',
        color: '#888',
    },
    statusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    statusOk: { color: '#10b981' },
    statusError: { color: '#ef4444' },
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface OutlineTreeItemProps {
    section: Section;
    level: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const OutlineTreeItem: React.FC<OutlineTreeItemProps> = ({ section, level, selectedId, onSelect }) => {
    const [expanded, setExpanded] = useState(true);
    const hasSubsections = section.subsections.length > 0;
    const isSelected = selectedId === section.id;

    return (
        <div style={{ marginLeft: level * 12 }}>
            <div
                onClick={() => onSelect(section.id)}
                style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                    color: isSelected ? '#fff' : '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    marginBottom: '2px',
                }}
            >
                {hasSubsections && (
                    <span
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        style={{ cursor: 'pointer', width: '16px' }}
                    >
                        {expanded ? '▼' : '▶'}
                    </span>
                )}
                {!hasSubsections && <span style={{ width: '16px' }} />}
                <span style={{ flex: 1 }}>{section.title || 'Untitled'}</span>
                {section.content.some(b => b.type === 'table' || b.type === 'figure') && (
                    <span title="Has figures/tables">🧩</span>
                )}
            </div>
            {expanded && section.subsections.map(sub => (
                <OutlineTreeItem
                    key={sub.id}
                    section={sub}
                    level={level + 1}
                    selectedId={selectedId}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
};

interface BlockEditorProps {
    block: Block;
    index: number;
    onUpdate: (block: Block) => void;
    onRemove: () => void;
    references: { id: string; title: string }[];
}

const BlockEditor: React.FC<BlockEditorProps> = ({ block, index, onUpdate, onRemove, references }) => {
    const renderEditor = () => {
        switch (block.type) {
            case 'paragraph':
                return (
                    <div>
                        <textarea
                            value={(block.data as any).text}
                            onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                backgroundColor: '#2a2a4a',
                                border: '1px solid #3a3a5a',
                                borderRadius: '4px',
                                padding: '10px',
                                color: '#fff',
                                resize: 'vertical',
                            }}
                        />
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                            Citations: {(block.data as any).citations?.join(', ') || 'None'}
                        </div>
                    </div>
                );

            case 'list':
                return (
                    <div>
                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '4px', display: 'block' }}>
                            <input
                                type="checkbox"
                                checked={(block.data as any).ordered}
                                onChange={(e) => onUpdate({ ...block, data: { ...block.data, ordered: e.target.checked } })}
                                style={{ marginRight: '6px' }}
                            />
                            Ordered List
                        </label>
                        <textarea
                            value={(block.data as any).items?.join('\n') || ''}
                            onChange={(e) => onUpdate({ ...block, data: { ...block.data, items: e.target.value.split('\n') } })}
                            placeholder="One item per line"
                            style={{
                                width: '100%',
                                minHeight: '60px',
                                backgroundColor: '#2a2a4a',
                                border: '1px solid #3a3a5a',
                                borderRadius: '4px',
                                padding: '10px',
                                color: '#fff',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                );

            case 'warning':
                return (
                    <textarea
                        value={(block.data as any).text}
                        onChange={(e) => onUpdate({ ...block, data: { text: e.target.value } })}
                        placeholder="Warning text..."
                        style={{
                            width: '100%',
                            minHeight: '40px',
                            backgroundColor: '#4a3a2a',
                            border: '1px solid #6a5a4a',
                            borderRadius: '4px',
                            padding: '10px',
                            color: '#ffa',
                            resize: 'vertical',
                        }}
                    />
                );

            default:
                return (
                    <div style={{ color: '#888', fontStyle: 'italic' }}>
                        {block.type} block (advanced editing)
                    </div>
                );
        }
    };

    return (
        <div
            style={{
                backgroundColor: '#1e1e3a',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '10px',
                border: '1px solid #3a3a5a',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    {block.type}
                </span>
                <button
                    onClick={onRemove}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '16px',
                    }}
                    title="Remove block"
                >
                    ×
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

    // Initialize document
    React.useEffect(() => {
        if (initialAST && isOpen) {
            setDocument(initialAST);
        }
    }, [initialAST, isOpen, setDocument]);

    const selectedSection = selectedSectionId ? getSection(selectedSectionId) : null;

    const handleValidate = useCallback(() => {
        const status = validate();
        if (status.errors.length > 0) {
            alert(`Validation errors:\n${status.errors.join('\n')}`);
        } else {
            alert('Document is valid! ✓');
        }
    }, [validate]);

    const handleCompile = useCallback(async () => {
        if (!document) return;
        setIsCompiling(true);
        setCompileError(null);

        try {
            // Call compile endpoint
            if (onCompile) {
                const blob = await onCompile(document);
                const url = URL.createObjectURL(blob);
                setPdfPreviewUrl(url); // Set for preview
            }
        } catch (err: any) {
            setCompileError(err.message || 'Compilation failed');
        } finally {
            setIsCompiling(false);
        }
    }, [document, onCompile]);

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
                {/* Top Bar */}
                <div style={styles.topBar}>
                    <div style={styles.topBarTitle}>
                        📄 Document Editor {isDirty && <span style={{ color: '#ffa' }}>*</span>}
                    </div>
                    <div style={styles.topBarButtons}>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={handleValidate}
                        >
                            ✓ Validate
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={handleCompile}
                            disabled={isCompiling}
                        >
                            {isCompiling ? '⏳ Compiling...' : '📄 Compile PDF'}
                        </button>
                        {pdfPreviewUrl && (
                            <button
                                style={{ ...styles.button, ...styles.secondaryButton }}
                                onClick={handleDownloadPdf}
                                title="Download Compiled PDF"
                            >
                                ⬇ Download
                            </button>
                        )}
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={handleSave}
                        >
                            💾 Save
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.dangerButton }}
                            onClick={onClose}
                        >
                            ✕ Close
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div style={styles.mainContent}>
                    {/* Pane 1: Outline Tree */}
                    <div style={{ ...styles.pane, ...styles.outlinePane }}>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Document Structure
                        </div>

                        {/* Document Title */}
                        {document && (
                            <div
                                onClick={() => selectSection(null)}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: '4px',
                                    backgroundColor: selectedSectionId === null ? '#4f46e5' : 'transparent',
                                    color: selectedSectionId === null ? '#fff' : '#ccc',
                                    cursor: 'pointer',
                                    marginBottom: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                }}
                            >
                                📄 {document.title || 'Untitled Document'}
                            </div>
                        )}

                        {/* Sections */}
                        {document?.sections.map((section) => (
                            <OutlineTreeItem
                                key={section.id}
                                section={section}
                                level={0}
                                selectedId={selectedSectionId}
                                onSelect={selectSection}
                            />
                        ))}
                    </div>

                    {/* Pane 2: Section Editor */}
                    <div style={{ ...styles.pane, ...styles.editorPane }}>
                        {selectedSectionId === null && document ? (
                            // Document-level editing
                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                                        Document Title
                                    </label>
                                    <input
                                        type="text"
                                        value={document.title}
                                        onChange={(e) => updateTitle(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2a2a4a',
                                            border: '1px solid #3a3a5a',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '16px',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                                        Abstract
                                    </label>
                                    <textarea
                                        value={document.abstract}
                                        onChange={(e) => updateAbstract(e.target.value)}
                                        style={{
                                            width: '100%',
                                            minHeight: '150px',
                                            padding: '10px',
                                            backgroundColor: '#2a2a4a',
                                            border: '1px solid #3a3a5a',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                            </div>
                        ) : selectedSection ? (
                            // Section editing
                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                                        Section Title
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedSection.title}
                                        onChange={(e) => updateSectionTitle(selectedSection.id, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2a2a4a',
                                            border: '1px solid #3a3a5a',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '14px',
                                        }}
                                    />
                                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                        Level: {selectedSection.level} | ID: {selectedSection.id}
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                                    Content Blocks ({selectedSection.content.length})
                                </div>

                                {selectedSection.content.map((block, index) => (
                                    <BlockEditor
                                        key={index}
                                        block={block}
                                        index={index}
                                        onUpdate={(updated) => updateBlock(selectedSection.id, index, updated)}
                                        onRemove={() => removeBlock(selectedSection.id, index)}
                                        references={document?.references || []}
                                    />
                                ))}

                                <button
                                    style={{ ...styles.button, ...styles.secondaryButton, marginTop: '10px' }}
                                    onClick={() => addBlock(selectedSection.id, {
                                        type: 'paragraph',
                                        data: { text: '', citations: [] }
                                    })}
                                >
                                    + Add Paragraph
                                </button>
                            </div>
                        ) : (
                            <div style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
                                Select a section to edit
                            </div>
                        )}
                    </div>

                    {/* Pane 3: Live Preview / Compile Result */}
                    <div style={{ ...styles.pane, ...styles.previewPane }}>
                        <div style={{
                            fontSize: '11px',
                            color: '#888',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>{pdfPreviewUrl ? 'PDF Preview' : 'Live Preview (Draft)'}</span>
                            {pdfPreviewUrl && (
                                <button
                                    onClick={() => setPdfPreviewUrl(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#4f46e5',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Show Draft
                                </button>
                            )}
                        </div>

                        {pdfPreviewUrl ? (
                            <iframe
                                src={pdfPreviewUrl}
                                style={{
                                    width: '100%',
                                    height: 'calc(100% - 30px)',
                                    border: 'none',
                                    backgroundColor: '#fff', // PDF needs white bg contrast usually
                                    borderRadius: '4px'
                                }}
                                title="PDF Preview"
                            />
                        ) : (
                            document && (
                                <div style={{ color: '#ccc', lineHeight: 1.6 }}>
                                    {/* HTML Preview Content */}
                                    <h1 style={{ fontSize: '18px', marginBottom: '10px', color: '#fff' }}>
                                        {document.title}
                                    </h1>
                                    {document.subtitle && (
                                        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>
                                            {document.subtitle}
                                        </p>
                                    )}
                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
                                        {document.authors.join(', ')} • {document.date}
                                    </p>

                                    <h2 style={{ fontSize: '14px', marginBottom: '8px', color: '#4f46e5' }}>Abstract</h2>
                                    <p style={{ fontSize: '13px', marginBottom: '20px', fontStyle: 'italic' }}>
                                        {document.abstract}
                                    </p>

                                    {document.sections.map((section, i) => (
                                        <div key={section.id} style={{ marginBottom: '16px' }}>
                                            <h2 style={{ fontSize: '14px', color: '#4f46e5', marginBottom: '6px' }}>
                                                {i + 1}. {section.title}
                                            </h2>
                                            {section.content.map((block, j) => (
                                                <div key={j} style={{ marginBottom: '8px', fontSize: '12px' }}>
                                                    {block.type === 'paragraph' && (block.data as any).text}
                                                    {block.type === 'warning' && (
                                                        <div style={{ backgroundColor: '#4a3a2a', padding: '6px', borderRadius: '4px', color: '#ffa' }}>
                                                            ⚠ {(block.data as any).text}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}

                                    <h2 style={{ fontSize: '14px', marginTop: '20px', marginBottom: '8px', color: '#4f46e5' }}>
                                        References
                                    </h2>
                                    {document.references.map((ref, i) => (
                                        <p key={ref.id} style={{ fontSize: '11px', marginBottom: '4px' }}>
                                            [{ref.id}] {ref.title}
                                        </p>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Status Bar */}
                <div style={styles.statusBar}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span style={styles.statusItem}>
                            Schema: <span style={validationStatus.schema ? styles.statusOk : styles.statusError}>
                                {validationStatus.schema ? '✓' : '✗'}
                            </span>
                        </span>
                        <span style={styles.statusItem}>
                            Citations: <span style={validationStatus.citations ? styles.statusOk : styles.statusError}>
                                {validationStatus.citations ? '✓' : '✗'}
                            </span>
                        </span>
                        <span style={styles.statusItem}>
                            Compile: <span style={validationStatus.compile ? styles.statusOk : styles.statusError}>
                                {validationStatus.compile ? '✓' : '✗'}
                            </span>
                        </span>
                    </div>
                    <div>
                        {compileError && <span style={{ color: '#ef4444' }}>Error: {compileError}</span>}
                        {!compileError && <span>Ready</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ASTEditorModal;
