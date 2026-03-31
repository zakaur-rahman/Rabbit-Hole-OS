'use client';

import { useCallback, useState } from 'react';
import { synthesisApi, SynthesisContextItem } from '@/lib/api';
import { useGraphStore } from '@/store/graph.store';
import { extractSynthesisMetadata } from '@/types/nodes';
import { DocumentAST } from '@/store/ast.store';
import { useSynthesisMonitorStore } from '@/store/synthesis-monitor.store';

/**
 * Encapsulates report generation via background streaming synthesis
 * and AST editor integration.
 */
export function useSynthesis() {
    const { setAuthModal } = useGraphStore();
    const monitor = useSynthesisMonitorStore;

    // AST editor state
    const [showASTEditor, setShowASTEditor] = useState(false);
    const [initialAST, setInitialAST] = useState<DocumentAST | null>(null);
    const [lastGeneratedAST, setLastGeneratedAST] = useState<DocumentAST | null>(null);
    const [synthesisError, setSynthesisError] = useState<string | null>(null);

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

    /**
     * Generate Report — launches background streaming synthesis.
     * Does NOT block the UI. Shows a floating notification instead.
     */
    const handleGenerateReport = useCallback(async () => {
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setAuthModal(true, 'Research synthesis and AI document structuring require a premium account.');
            return;
        }

        const { nodes, edges, activeWhiteboardId } = useGraphStore.getState();
        if (nodes.length === 0) return;

        const state = monitor.getState();
        if (state.pipelineStatus === 'running') {
            // Already running — toggle the monitor panel open
            monitor.getState().setShowMonitorPanel(true);
            return;
        }

        // Reset + start pipeline state
        monitor.getState().startPipeline();

        const contextItems = buildContextItems();

        monitor.getState().pushLog('System', 'info', `Compiling ${nodes.length} nodes for context...`);
        monitor.getState().pushLog('System', 'step', 'Connecting to orchestrator SSE...');

        const startTime = Date.now();
        const elapsedInterval = setInterval(() => {
            monitor.getState().setElapsedMs(Date.now() - startTime);
        }, 200);

        // Fire-and-forget in a background closure
        (async () => {
            try {
                let finalAST: DocumentAST | null = null;
                let agentsCompleted = 0;
                const totalAgents = 7;

                await synthesisApi.streamResearchAST(
                    'Synthesized Research Report',
                    contextItems,
                    edges,
                    (step) => {
                        // Track stage changes
                        if (step.stage) {
                            const prevActive = monitor.getState().activeAgentId;
                            if (prevActive && prevActive !== step.stage) {
                                monitor.getState().setAgentStatus(prevActive, 'completed');
                                agentsCompleted++;
                            }
                            monitor.getState().setAgentStatus(step.stage, 'running');
                            monitor.getState().pushLog(step.stage, 'step', step.message || `${step.stage} started`);
                        }

                        // Update progress
                        if (step.progress !== undefined) {
                            monitor.getState().setProgress(step.progress);
                        } else {
                            monitor.getState().setProgress(Math.round((agentsCompleted / totalAgents) * 100));
                        }

                        // Capture job ID
                        if (step.job_id) {
                            monitor.getState().setJobId(step.job_id);
                        }

                        // Info messages
                        if (step.message && !step.stage) {
                            monitor.getState().pushLog(
                                monitor.getState().activeAgentId || 'System',
                                'info',
                                step.message
                            );
                        }

                        // Store agent data when available (prompt, response, json)
                        if (step.stage && step.data) {
                            monitor.getState().setAgentResponse(step.stage, {
                                prompt: step.data.prompt || '',
                                response: step.data.response || '',
                                json: step.data.json || null,
                            });
                        }

                        // Capture final AST from completion events
                        if (step.status === 'COMPLETED' || step.stage === 'DONE' || step.stage === 'Ready') {
                            if (step.document) finalAST = step.document as unknown as DocumentAST;
                            if (step.output_ast) finalAST = step.output_ast as unknown as DocumentAST;
                        }

                        // Handle failures
                        if (step.status === 'failed') {
                            const activeAgent = monitor.getState().activeAgentId;
                            if (activeAgent) {
                                monitor.getState().setAgentStatus(activeAgent, 'error');
                            }
                            monitor.getState().pushLog(
                                activeAgent || 'System',
                                'error',
                                step.error || 'Agent failed'
                            );
                        }
                    },
                    activeWhiteboardId
                );

                clearInterval(elapsedInterval);

                // Mark remaining running agents as complete
                const finalState = monitor.getState();
                if (finalState.activeAgentId) {
                    monitor.getState().setAgentStatus(finalState.activeAgentId, 'completed');
                }

                if (finalAST) {
                    monitor.getState().pushLog('System', 'ok', 'Report generated successfully.');
                    monitor.getState().completePipeline(finalAST);
                } else {
                    monitor.getState().pushLog('System', 'error', 'Synthesis did not return a document.');
                    monitor.getState().failPipeline('Synthesis did not return a document. Please try again.');
                }
            } catch (error) {
                clearInterval(elapsedInterval);
                const msg = error instanceof Error ? error.message : String(error);
                monitor.getState().pushLog('System', 'error', msg);
                monitor.getState().failPipeline(msg);
            }
        })();
    }, [buildContextItems, setAuthModal, monitor]);

    /** Open AST Editor with the completed document from the pipeline */
    const handleOpenCompletedReport = useCallback(() => {
        const ast = monitor.getState().completedAST;
        if (ast) {
            setInitialAST(ast);
            setShowASTEditor(true);
            monitor.getState().dismissNotification();
        }
    }, [monitor]);

    /** Compile AST → PDF from ASTEditorModal */
    const handleCompileAST = useCallback(async (ast: DocumentAST): Promise<Blob> => {
        setShowASTEditor(false);
        const blob = await synthesisApi.generatePdfFromAST(ast);
        return blob;
    }, []);

    return {
        // AST editor
        showASTEditor, setShowASTEditor,
        initialAST, setInitialAST,
        // Handlers
        handleGenerateReport,
        handleOpenCompletedReport,
        handleCompileAST,
    };
}
