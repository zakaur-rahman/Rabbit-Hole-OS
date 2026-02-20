# Cognode — Frontend

The Next.js 16 web application powering the Cognode canvas interface.

---

## Getting Started

```bash
npm install
npm run dev          # localhost:3000
```

---

## Stack

| Library | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework, routing, SSR |
| React 19 | UI runtime |
| ReactFlow 11 | Interactive knowledge graph canvas |
| Zustand 5 | Global state (graph, AST) |
| Tiptap 3 | Rich-text note editor |
| Tailwind CSS 4 | Styling |
| Framer Motion 12 | Animations |
| Lucide React | Icons |
| react-pdf | PDF preview |
| react-resizable-panels | AST editor layout |

---

## Key Directories

```
app/                    Next.js App Router pages + layouts
components/
  canvas/               Canvas: CanvasView, node types, overlays, controls
  browser/              BrowserView — Electron webview integration
  synthesis/            Synthesis modal + SSE progress stream
  modals/               ASTEditorModal, ResearchPdfModal, TemplateModal…
  ui/                   ContextMenu, shared primitives
hooks/
  useContextMenu.ts     Right-click menus (node / pane / edge)
  useConnectionDrop.ts  Empty-canvas drop → node creation popup
  useFileDrop.ts        Drag & drop image / PDF → node
  useNodeCreation.ts    Toolbar: add note/group/text/template
  useSynthesis.ts       PDF synthesis + AST editor state
store/
  graph.store.ts        Nodes, edges, whiteboards, selection (Zustand)
  ast.store.ts          Document AST for the editor (Zustand)
lib/
  api.ts                Typed API client
  export.ts             Graph → Markdown export
types/
  nodes.ts              TypeScript interfaces for all 15 node data types
```

---

## Environment Variables

Create `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Node Types

The canvas supports 15 node types. See [`../../apps/backend/NODES.md`](../../apps/backend/NODES.md) for the full synthesis-influence reference.

| Node | Type key | Color |
|---|---|---|
| Web Article | `article` | Green |
| Live Web Page | `web` | Green |
| PDF Document | `pdf` | Red |
| Image | `image` | Blue |
| Code Snippet | `code` | Orange |
| Research Note | `note` | Yellow |
| Plain Text | `text` | White |
| Video | `video` | Red |
| Academic Paper | `academic` | Blue |
| Product | `product` | Purple |
| Annotation | `annotation` | Amber |
| Comment (Instruction) | `comment` | Amber (dashed edge) |
| Sub-Canvas | `canvas` | Gray |
| Group / Container | `group` | Transparent border |
| Synthesis Output | `synthesis` | Green |
