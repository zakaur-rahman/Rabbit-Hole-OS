# Cognode Architecture Overview

Cognode is a modular, scalable knowledge synthesis platform. This document covers the full system architecture as it exists today.

---

## System Components

```
cognode/
├── apps/frontend/      Next.js 16 — canvas UI, browser, synthesis modals
├── apps/backend/       FastAPI — REST API, agent pipeline, job queue
└── apps/desktop/       Electron — desktop wrapper with integrated webview
```

---

## Frontend Architecture (Next.js + ReactFlow)

### Canvas System

`CanvasView.tsx` is the root canvas component, composed from 5 hooks:

```
CanvasView.tsx (~490 lines)
├── useSynthesis.ts          PDF generation, AST editor modal state
├── useContextMenu.ts        Node / pane / edge right-click menus, clipboard
├── useConnectionDrop.ts     Drop-on-empty-canvas → node creation popup
├── useNodeCreation.ts       Toolbar quick-add: note, group, text, template
└── useFileDrop.ts           Drag-and-drop image/PDF → auto-upload node
```

Two extracted canvas components:
- `CanvasOverlay.tsx` — stats badge + node-type legend
- `ConnectionDropMenu.tsx` — connection-drop popup + SVG line overlay

### State Management (Zustand)

| Store | Key State |
|---|---|
| `graph.store.ts` | `nodes`, `edges`, `whiteboards`, `selectedNodeId`, `nodeClickTs`, `activeWhiteboardId` |
| `ast.store.ts` | `document` (DocumentAST), `selectedSectionId`, `validationStatus`, `isDirty` |

`nodeClickTs` — a `Date.now()` timestamp bumped on every `selectNode()` call, including re-clicks of the same node. Allows `BrowserView.tsx` to sync even when `selectedNodeId` doesn't change.

### Node Types (15)

| Type | Component |
|---|---|
| `article`, `web` | ArticleNode, WebNode |
| `pdf`, `image` | PdfNode (dynamic import), ImageNode |
| `video`, `academic` | VideoNode, AcademicNode |
| `code` | CodeNode |
| `note`, `text`, `annotation` | NoteNode, TextNode, AnnotationNode |
| `product` | ProductNode |
| `canvas` | CanvasNode (sub-canvas / nested whiteboard) |
| `group` | GroupNode (container, zIndex -1) |
| `comment` | CommentNode (AI instruction, dashed amber edge) |
| `synthesis` | SynthesisNode (output document) |
| `ghost` | GhostNode (placeholder) |

### Browser Integration

`BrowserView.tsx` embeds an Electron webview. Key behaviors:
- Every navigation creates a child node (parent–child graph)
- Syncs to `selectedNodeId` via `useEffect` — re-runs when `nodeClickTs` changes
- `autoAddNodeToGraph` uses a debounced timeout ref (no race conditions)

### API Client

`lib/api.ts` provides typed wrappers for all backend endpoints. Auth token is read from `localStorage.getItem('auth_token')`.

---

## Backend Architecture (FastAPI + arq)

### API Layers
```
app/
├── api/v1/
│   ├── nodes.py        CRUD + processUrl (scrape + auto-type-detect)
│   ├── edges.py        Edge CRUD with cascade-delete
│   ├── synthesis.py    POST /research-ast + SSE progress stream
│   ├── files.py        File upload (image/PDF → storage)
│   └── oauth.py        Clerk + Google PKCE OAuth
├── services/
│   ├── agents.py       7 AI agents (Planner→Writer→Reviewer→Charts→Bib→Memory→Recovery)
│   ├── chunk_service.py  Type-aware context chunking (15 node types)
│   ├── document_ast.py   Pydantic DocumentAST schema + validation
│   ├── scraper.py      URL scraper + detect_content_type()
│   └── llm.py          LLM provider selection (Gemini→HF→Chutes→OpenAI→Mock)
└── workers/
    └── synthesis_worker.py  arq background job handler
```

### Agent Pipeline

```
POST /research-ast
  │
  ├─ SHA256 hash check (Redis cache hit? → return instantly)
  │
  └─ ResearchJob created in Postgres → enqueued in Redis
       │
       ▼  [arq worker picks up]
       1. PlannerAgent     → outline (progress 20%)
       2. WriterAgent      → DocumentAST JSON (progress 40%)  ← FATAL if fails
       3. ReviewerAgent    → validated AST (progress 60%)
       4. ChartFigureAgent → figure recommendations (progress 75%)
       5. BibNormalizerAgent → deduplicated refs (progress 85%)
       6. CompilationTask  → LaTeX → PDF (non-fatal)
       7. MemoryAgent      → cross-doc patterns (non-fatal)
       │
       └─ COMPLETED event published → SSE stream → frontend
```

See [`AGENTS.md`](../../apps/backend/AGENTS.md) for full agent reference.

### Database (PostgreSQL)

Tables: `users`, `whiteboards`, `nodes`, `edges`, `research_jobs`, `job_logs`

Edge rows have `CASCADE DELETE` on `node_id` foreign keys — deleting a node removes its edges automatically.

### Cache & Job Queue (Redis)

- **arq** manages the synthesis job queue
- **Pub/Sub** streams progress events to the API SSE endpoint
- **Cache key** = SHA256 of `(query + sorted context + orchestrator_version)`
- Recommended eviction policy: `allkeys-lru` (but protect queue keys)

---

## Data Flow: Synthesis

```
Canvas (Frontend)
  └── User clicks "Synthesize"
      │
      POST /api/v1/synthesis/research-ast
      { query, context_items: [{ node_id, node_type, metadata, content, ... }] }
      │
      chunk_service.segment_nodes()   ← type-aware chunking
      │   [ACADEMIC_PAPER], [IMAGE], [CODE:python], [RESEARCHER_NOTE] ...
      │
      agents pipeline (7 steps)
      │
      DocumentAST → LaTeX → PDF
      │
      SSE stream → ResearchPdfModal (frontend)
      │
      ASTEditorModal (optional manual editing before recompile)
```

See [`NODES.md`](../../apps/backend/NODES.md) for how each node type influences the synthesis output.

---

## Security

- **Auth**: Modern JWT + Google OAuth (PKCE) with independent session management. Auth token verified server-side on every request.
- **Data isolation**: All queries are filtered by `user_id` + `whiteboard_id`.
- **LocalStorage Persistence**: Authentication tokens and user profiles are stored in `localStorage` to ensure persistence across sessions and tabs.
- **LaTeX sandbox**: Compilation via `tectonic.exe` (bundled binary) — no network, restricted filesystem.
- **CORS**: Only whitelisted origins (`localhost:3000` in dev, configured domain in prod).

---

## Desktop (Electron)

- Renders the Next.js frontend in a `BrowserWindow` (not the system browser)
- Embeds a separate `<webview>` for the integrated browser (separate renderer process)
- Custom protocol: `cognode://` deep links for OAuth redirect handling
- Preload script: `contextIsolation: true`, `sandbox: true`

---

*Last updated: 2026-02-20*
