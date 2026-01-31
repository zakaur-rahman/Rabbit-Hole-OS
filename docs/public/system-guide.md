# Cognode: System Documentation & Architecture Guide

Cognode is an AI-native research operating system and knowledge graph. It is designed to bridge the gap between fragmented information retrieval and high-fidelity knowledge synthesis, providing a deterministic workspace for scholars, analysts, and system designers.

---

## 1. Introduction

### What is Cognode?
Cognode is not a static document editor or a simple web browser. It is a research-first environment where information is treated as a dynamic, interconnected graph. It serves as a cognitive extension for users who need to navigate complex information landscapes and synthesize structured, verifiable knowledge.

### Core Problem It Solves
Traditional research tools suffer from "tab fatigue" and "document fragmentation." Valuable context is lost as users move between browser tabs, PDF readers, and note-taking apps. Cognode unifies these workflows into a single persistent workspace where exploration and synthesis occur in parallel.

### Why Traditional Tools Fail
- **Linearity**: Most tools force information into linear lists or folders, which fails to capture the multidimensional relationships between research topics.
- **Context Decay**: Information captured in one session often lacks the lineage of where it came from or why it was deemed important.
- **Disconnected Synthesis**: The act of writing is typically separated from the act of research, leading to manual data entry and increased error rates.

### Cognode Philosophy
Cognode operates on the principle of **Graph-First Thinking**. Every piece of data is a node, and every relationship is an edge. By maintaining a continuous link between raw evidence and synthesized conclusions, Cognode ensures that knowledge remains traceable, verifiable, and evolvable.

---

## 2. Core Concepts

### Knowledge Graph
The primary data structure of Cognode. It represents the entirety of a user's research as a network of entities and relationships.

### Nodes and Edges
- **Nodes**: Atomic units of information (URLs, articles, topics, comments).
- **Edges**: Semantic connections that define how information flows (e.g., "Source Of," "Critiques," "Supports").

### Whiteboards
A whiteboard is a distinct workspace or "canvas" dedicated to a specific research project. It provides data isolation and focused visualization.

### Tabs and Canvases
Unlike standard browsers, every tab in Cognode is represented as a node on the canvas. Closing a tab does not remove the information; it remains as a persistent node in the graph.

### Persistent Workspace
Cognode saves the state of every node, edge, and view. This allows users to resume research months later with the full spatial context preserved.

---

## 3. Graph Browser System

### Multi-Tab Browsing Model
Cognode integrates a web engine directly into the graph. Every navigation starts from a node, creating a natural branching structure for web exploration.

### Parent–Child URL Tracking
When a user clicks a link within the built-in browser, Cognode detects the navigation and automatically creates a child node. This preserves the "scent" of the research trail.

### Node Generation from URLs
As pages load, the system extracts metadata (title, icon, summary) to create a visual representation of the web resource on the canvas.

### Graph Expansion Behavior
As the user explores, the graph grows organically. This avoids the clutter of a flat bookmark list by nesting related discoveries under their point of origin.

---

## 4. Article Node Intelligence

### AI Topic Extraction
When a web page or PDF is added to the graph, the system performs an asynchronous semantic analysis to identify the primary entities and concepts involved.

### Sub-topic Detection
Large documents are broken down into logical "knowledge units." These units represent granular sub-topics that can be independently cited or reused.

### Selectable Knowledge Units
Users can "pick" specific units or claims from an article node to include in their synthesis, rather than being forced to ingest the entire document.

### Article Node Cards
Visual containers on the canvas that display the high-level summary, extracted topics, and the extracted knowledge units.

---

## 5. Comment Nodes (AI Instruction Nodes)

### Purpose of Comment Nodes
Comment nodes allow users to provide explicit guidance to the synthesis system. They act as strategic directives rather than just passive notes.

### One-to-One Node Constraint
A comment node can be attached to a specific node (contextual instruction) or exist as a floating directive (global instruction).

### Influencing AI Behavior
By connecting a comment node to an article or a cluster of nodes, the user can specify:
- **Inclusion**: "Focus heavily on the statistical methodology in this paper."
- **Exclusion**: "Ignore the historical background section of this node."
- **Critique**: "Contrast this claim with the evidence found in Node B."

### Instruction Merging Logic
The system merges the user's instructions with the synthesized context to ensure the final output aligns with the researcher's intent without losing academic objectivity.

---

## 6. AI Synthesis Engine

### Selected Topic Pipeline
Synthesis begins when a user selects a cluster of nodes on the canvas. This selection defines the boundary of the research context.

### Context Assembly
The engine collects all text from selectable knowledge units, user comments, and metadata within the selection. It then prioritizes this information based on graph distance and user-weighted instructions.

### Graph-Aware Synthesis
The engine does not treat text as a flat file. It understands the edges connecting nodes, allowing it to generate comparisons ("Paper A says X, but Paper B disagrees") automatically based on the graph structure.

### Deduplication Handling
The system identifies overlapping claims across multiple sources and merges them into specialized synthesis units, avoiding redundancy in the final document.

---

## 7. Multi-Agent Architecture

Cognode uses a swarm of specialized agents to ensure high-fidelity outputs:

- **Planner Agent**: Analyzes the research intent and architects a multi-section logic flow.
- **Writer Agent**: Converts the gathered context into a structured Abstract Syntax Tree (AST).
- **Reviewer Agent**: Critically evaluates the synthesized content for logical consistency and academic rigor.
- **Retry & Fallback Agent**: Monitors execution failures and re-initializes agents with adjusted parameters if errors occur.
- **Chart & Figure Agent**: Scans context for data points and recommends the most effective visualization (Tables, Charts, Timelines).
- **Bibliography Normalizer**: Cross-references citations against global databases to ensure perfect formatting and valid links.
- **Memory Agent**: Identifies recurring structural patterns and updates the user's long-term knowledge memory.

---

## 8. Execution Orchestration Layer

### Job Lifecycle
Every synthesis task is treated as a persistent "Research Job."
1. **IDLE**: Request received and validated.
2. **PLANNING**: Structure being designed.
3. **WRITING**: Content being generated.
4. **COMPILING**: LaTeX generation and PDF creation.
5. **COMPLETED**: Output finalized and cached.

### Deterministic Execution
To ensure reliability, the system calculates a unique hash based on the input nodes, edges, and instruction set.

### Prompt Hashing
If the system detects a matching hash from a previous run, it serves the cached result instantly, preventing redundant execution and maintaining consistency.

### Redis / Queue Orchestration
Background tasks are managed via isolated workers. This ensures that a single heavy research job does not degrade the performance of the overall platform.

---

## 9. Epistemic Intelligence Layer

### Claim Extraction
Cognode automatically identifies "claims" (testable statements of fact) within synthesized text.

### Evidence Scoring
Each claim is assigned a score based on the strength and quantity of supporting evidence found within the provided context nodes.

### Confidence Levels
The system displays visual confidence indicators (Low, Medium, High) for synthesized sections, alerting the user when the source data is sparse.

### Uncertainty Detection
The engine explicitly identifies "gaps" in the research—areas where the provided sources do not provide sufficient information to reach a conclusion.

---

## 10. Cognitive Reasoning Graph

### Claim-to-Claim Reasoning
The system visualizes the logical connections between individual claims, showing how one conclusion depends on several underlying premises.

### Assumptions vs. Conclusions
Cognode distinguishes between "Ground Truth" (user-verified facts) and "Inferences" (AI-generated conclusions), allowing users to audit the logic path.

### Dependency Tracing
Users can click on any synthesized paragraph to see exactly which source nodes and specific knowledge units contributed to that specific text.

---

## 11. LaTeX & Document System

### AST-Based Document Model
Cognode does not edit plain text. It maintains an Abstract Syntax Tree (AST) that represents the semantic structure of the document (Sections, Lists, Citations, Figures).

### Safe Structured Editing
Changes to the document are performed by modifying the AST, ensuring that formatting and citation integrity are never compromised by manual typing errors.

### AST → LaTeX Rendering
The system converts the validated AST into high-quality LaTeX source code, optimized for academic journals and technical reports.

### Compilation Validation Loop
A background compiler (Tectonic/pdflatex) attempts to render the document. If it fails, the **Recovery Agent** analyzes the log and patches the AST automatically.

---

## 12. Visual Intelligence

### Chart Decision Engine
Rather than asking the user for chart types, the system analyzes the numerical data in the context and selects the most appropriate representation (e.g., a line chart for trends, a bar chart for categorical comparisons).

### Data-Driven Visualization Logic
Figures are not just static images; they are generated nodes that maintain a link to the original data sources, allowing for easy updates if the underlying research changes.

---

## 13. Memory & Learning System

### Cross-Document Learning
Cognode learns the "structural" patterns of your research across multiple whiteboards.

### Structural Memory Only
The system remembers *how* you organize projects and *what types* of concepts you focus on, rather than the sensitive content itself.

### No Content Leakage
Memory is isolated per user. Information from Confidential Project A will never be suggested or used in the synthesis of Project B.

---

## 14. User Interface Overview

- **Graph Canvas**: The primary workspace for exploring and connecting knowledge.
- **Node Cards**: Interactive containers for URLs, articles, and synthesis units.
- **Agent Chat Interface**: A sidebar for collaborating with the orchestrator and providing refined instructions.
- **AST Editor**: A structured view for modifying the synthesized document without touching raw code.
- **Confidence Indicators**: Visual heatmaps on the document that show the epistemic strength of each section.

---

## 15. Data Storage & Sync

### Local-First Architecture
Research data is stored locally on the user's device for maximum speed and privacy.

### Sync Triggers
Cognode periodically synchronizes work-in-progress to the secure cloud to enable cross-device access and backup.

### Conflict Handling
The system uses a "Last Write Wins" strategy with a full version history, allowing users to revert to any previous state of the graph.

---

## 16. Security & Trust Model

### No Hallucination Policy
The synthesis engine is strictly constrained to the provided context nodes. If a claim cannot be found in the sources, the system is instructed to indicate a knowledge gap rather than inventing information.

### Citation Enforcement
Every synthesized claim must have a corresponding citation. The system will fail a review step if a statement lacks evidence.

### Reference Locking
Generated bibliographies are locked to the specific node IDs on the canvas, ensuring that "Source 1" in the text always corresponds exactly to the user's "Source 1" node.

---

## 17. Typical User Workflows

### 1. Research Exploration
- Add a starting URL.
- Expand the graph by following links in the integrated browser.
- Annotate discoveries with comment nodes.

### 2. Topic Selection
- Multi-select a cluster of high-value nodes.
- Define the research query in the synthesis panel.

### 3. AI Synthesis
- Monitor the agent pipeline as it plan, writes, and reviews.
- View real-time progress updates on the canvas.

### 4. Review and Editing
- Audit the confidence levels.
- Trace claims back to source nodes.
- Refine instructions via comment nodes and regenerate if necessary.

### 5. Publishing
- Preview the generated PDF.
- Export to LaTeX or PDF for final submission.

---

## 18. System Limitations

- **Boundary of AI Reasoning**: The system can identify patterns but cannot replace the intuitive "Aha!" moment of human scholarship.
- **Manual Verification Required**: While the system identifies evidence, the user must perform the final review of the sources' credibility.
- **What Cognode Does Not Do**: It is not a general-purpose chat bot or a generic web search engine; it is a specialized tool for structured knowledge work.

---

## 19. Future Roadmap

- **Hypothesis Engine**: An agent that proactively suggests new research directions based on contradictions found in the graph.
- **Debate Simulation**: The ability to have agents argue different sides of a claim using the user's sources.
- **Knowledge Evolution Timelines**: Visualizing how a research topic has changed over time across the user's entire history.

---

## 20. Summary

Cognode is a **Research Operating System**. It moves the act of scholarship from disconnected files and browser tabs into a unified, intelligent knowledge graph. By prioritizing the relationship between pieces of information and ensuring every synthesis is grounded in verifiable evidence, Cognode provides a foundation for the next generation of high-fidelity knowledge work.

---
*Official Product Documentation | Cognode.ai*
