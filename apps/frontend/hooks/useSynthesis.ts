'use client';

import { useCallback, useState } from 'react';
import { synthesisApi, SynthesisContextItem } from '@/lib/api';
import { useGraphStore } from '@/store/graph.store';
import { extractSynthesisMetadata } from '@/types/nodes';
import { DocumentAST } from '@/store/ast.store';

/**
 * Encapsulates all AI synthesis state + handlers previously inline in CanvasView.
 * Eliminates the giant synthesis block from the 1700-line component.
 */
export function useSynthesis() {
    const { setAuthModal } = useGraphStore();

    // PDF modal state
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthesisStage, setSynthesisStage] = useState<string | null>(null);
    const [synthesisMessage, setSynthesisMessage] = useState<string | null>(null);
    const [synthesisError, setSynthesisError] = useState<string | null>(null);

    // AST editor state
    const [showASTEditor, setShowASTEditor] = useState(false);
    const [initialAST, setInitialAST] = useState<DocumentAST | null>(null);
    const [lastGeneratedAST, setLastGeneratedAST] = useState<DocumentAST | null>(null);

    /** Build context items from current canvas nodes — always includes node_type + metadata */
    const buildContextItems = useCallback((): SynthesisContextItem[] => {
        const { nodes, edges } = useGraphStore.getState();

        return nodes.map(node => {
            let content = node.data.content || '';
            const selectedTopics: string[] = node.data.selectedTopics || [];

            // Inject focus topics into article content
            if (node.type === 'article' && selectedTopics.length > 0) {
                content = `*** FOCUS TOPICS: ${selectedTopics.join(', ')} ***\n\nFULL SOURCE CONTENT:\n${content}`;
            }

            // Look up any instruction comment connected to this node
            const commentNode = nodes.find(
                n => n.type === 'comment' && edges.some(e => e.source === n.id && e.target === node.id)
            );

            return {
                node_id: node.id,
                title: node.data.title || 'Untitled',
                content,
                url: node.data.url || '',
                node_type: node.type || 'article',
                metadata: extractSynthesisMetadata(node.data),
                selected_topics: selectedTopics,
                outline: node.data.outline || [],
                system_instruction: commentNode?.data?.content,
            };
        });
    }, []);

    /** Open AST editor: fetches document structure from backend first */
    const handleOpenASTEditor = useCallback(async (ast?: DocumentAST) => {
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setAuthModal(true, 'Research synthesis and AI document structuring require a premium account.');
            return;
        }

        const { nodes, edges, activeWhiteboardId } = useGraphStore.getState();
        if (nodes.length === 0) return;

        setShowASTEditor(true);
        setInitialAST(ast || null);
        setSynthesisError(null);

        if (ast) {
            return; // Skip the network request if AST is already provided
        }

        try {
            const contextItems = buildContextItems();
            const response = await synthesisApi.getResearchAST(
                'Synthesized Research Report',
                contextItems,
                false,
                edges,
                activeWhiteboardId
            );
            if (response.status === 'success' || response.status === 'partial') {
                const docAST = response.document as unknown as DocumentAST;
                setInitialAST(docAST);
                setLastGeneratedAST(docAST);
            } else {
                setSynthesisError('AST generation failed');
                setShowASTEditor(false);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to load document structure';
            setSynthesisError(msg);
            setShowASTEditor(false);
        }
    }, [buildContextItems, setAuthModal]);

    /** Run full streaming synthesis → PDF */
    const handleSynthesis = useCallback(async (useDummyDataArg: boolean = false) => {
        const useDummyData = useDummyDataArg === true;

        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setAuthModal(true, 'Advanced research synthesis and report generation require an account.');
            return;
        }

        const { nodes: currentNodes, edges: currentEdges, activeWhiteboardId } = useGraphStore.getState();
        if (currentNodes.length === 0) return;

        setShowPdfModal(true);
        setIsSynthesizing(true);
        setPdfUrl(null);
        setSynthesisError(null);

        try {
            const contextItems = buildContextItems();

            if (useDummyData) {
                const blob = await synthesisApi.generateLatexResearchPdf(
                    'Dummy Research Report', contextItems, false, true, currentEdges
                );
                const blobUrl = URL.createObjectURL(blob);
                setPdfUrl(blobUrl);
                // Schedule cleanup for the previous URL on next render
                return;
            }

            // Streaming multi-agent synthesis
            let finalAST: DocumentAST | null = null;
            let streamError: string | null = null;

            await synthesisApi.streamResearchAST(
                'Synthesized Research Report',
                contextItems,
                currentEdges,
                (step) => {
                    setSynthesisStage(step.stage || null);
                    setSynthesisMessage(step.message || '');
                    if ((step.stage === 'Ready' || step.status === 'COMPLETED') && step.document) {
                        finalAST = step.document as unknown as DocumentAST;
                        setLastGeneratedAST(finalAST);
                    }
                    if (step.output_ast) {
                        // Support structure generated by alternative synthesis pipeline
                        finalAST = step.output_ast as unknown as DocumentAST;
                        setLastGeneratedAST(finalAST);
                    }
                    if (step.status === 'failed') {
                        // Capture error without throwing inside callback
                        streamError = step.error || 'Synthesis pipeline failed';
                    }
                },
                activeWhiteboardId
            );

            // Check for errors captured during streaming
            if (streamError) {
                setSynthesisError(streamError);
                return;
            }

            if (!finalAST) {
                setSynthesisError('Synthesis did not return a document. Please try again.');
                return;
            }

            // Compile PDF from AST
            setSynthesisStage('Compiling');
            setSynthesisMessage('Converting AST to LaTeX and compiling PDF...');
            const pdfBlob = await synthesisApi.generatePdfFromAST(finalAST);
            setPdfUrl(URL.createObjectURL(pdfBlob));

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            setSynthesisError(msg);
        } finally {
            setIsSynthesizing(false);
            setSynthesisStage(null);
            setSynthesisMessage(null);
        }
    }, [buildContextItems, setAuthModal]);

    return {
        // PDF modal
        showPdfModal, setShowPdfModal,
        pdfUrl, setPdfUrl,
        isSynthesizing,
        synthesisStage,
        synthesisMessage,
        synthesisError,
        // AST editor
        showASTEditor, setShowASTEditor,
        initialAST, setInitialAST,
        // Handlers
        handleSynthesis,
        handleOpenASTEditor,
    };
}
