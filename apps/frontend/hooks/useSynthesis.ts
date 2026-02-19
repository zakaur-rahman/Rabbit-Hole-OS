'use client';

import { useCallback, useState } from 'react';
import { synthesisApi, SynthesisContextItem } from '@/lib/api';
import { useGraphStore } from '@/store/graph.store';
import { extractSynthesisMetadata } from '@/types/nodes';

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
    const [initialAST, setInitialAST] = useState<any>(null);

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
    const handleOpenASTEditor = useCallback(async () => {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
            setAuthModal(true, 'Research synthesis and AI document structuring require a premium account.');
            return;
        }

        const { nodes, edges, activeWhiteboardId } = useGraphStore.getState();
        if (nodes.length === 0) return;

        setShowASTEditor(true);
        setInitialAST(null);

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
                setInitialAST(response.document);
            }
        } catch (error) {
            console.error('Failed to load AST:', error);
            setShowASTEditor(false);
        }
    }, [buildContextItems, setAuthModal]);

    /** Run full streaming synthesis → PDF */
    const handleSynthesis = useCallback(async (useDummyDataArg: any = false) => {
        const useDummyData = useDummyDataArg === true;

        if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token')) {
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
                setPdfUrl(URL.createObjectURL(blob));
                return;
            }

            // Streaming multi-agent synthesis
            let finalAST: any = null;
            await synthesisApi.streamResearchAST(
                'Synthesized Research Report',
                contextItems,
                currentEdges,
                (step) => {
                    setSynthesisStage(step.stage);
                    setSynthesisMessage(step.message || '');
                    if ((step.stage === 'Ready' || step.status === 'COMPLETED') && step.document) {
                        finalAST = step.document;
                    }
                    if (step.status === 'failed') {
                        throw new Error(step.error || 'Synthesis failed');
                    }
                },
                activeWhiteboardId
            );

            if (!finalAST) throw new Error('Synthesis did not return a document.');

            // Compile PDF from AST
            setSynthesisStage('Compiling');
            setSynthesisMessage('Converting AST to LaTeX and compiling PDF...');
            const pdfBlob = await synthesisApi.generatePdfFromAST(finalAST);
            setPdfUrl(URL.createObjectURL(pdfBlob));

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Synthesis failed:', msg);
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
