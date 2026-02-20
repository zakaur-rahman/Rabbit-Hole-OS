# Cognode

**Cognode** is an AI-native research operating system — a persistent knowledge graph where you browse the web, collect sources, and synthesize them into publication-ready research documents using a multi-agent AI pipeline.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Knowledge Graph Canvas** | Visualize relationships between articles, PDFs, videos, code, and notes as an interactive node graph (powered by ReactFlow). |
| **Integrated Web Browser** | Every browser tab becomes a node. Navigation history is preserved as a graph structure. |
| **Multi-Agent Synthesis** | 7 specialized AI agents (Planner → Writer → Reviewer → Charts → Bib → Memory → Recovery) produce academic-grade research documents. |
| **AST Document Editor** | Visual and code-mode editing of the synthesized document structure before PDF compilation. |
| **LaTeX → PDF Pipeline** | Validated AST is compiled to PDF via Tectonic (bundled). Smart error recovery is automatic. |
| **Deterministic Caching** | SHA256 prompt hashing — identical research queries are served instantly from cache. |
| **System Instruction Nodes** | Comment nodes that attach to any node and steer the AI during synthesis. |
| **Multi-Whiteboard Support** | Full data isolation per whiteboard (canvas). |

---

## 🏗️ Architecture

```
cognode/                             (pnpm/npm workspace monorepo)
├── apps/
│   ├── frontend/                    Next.js 16 + ReactFlow + Zustand + Tailwind 4
│   ├── backend/                     FastAPI + SQLAlchemy + arq (Redis job queue)
│   └── desktop/                     Electron wrapper with integrated webview browser
└── docs/                            Developer + user documentation
```

### Service Ports (dev)
| Service | Port |
|---|---|
| Frontend (Next.js) | `3000` |
| Backend API (FastAPI) | `8000` |
| Electron Desktop | renders at `localhost:3000` |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+
- **Redis** (local or [Upstash](https://upstash.com))
- **PostgreSQL** (local or [Neon](https://neon.tech))

### 1. Install dependencies
```bash
npm install
cd apps/frontend && npm install
cd apps/desktop && npm install
```

### 2. Configure environment

**Backend** — `apps/backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/cognode
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_key_here
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

**Frontend** — `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

### 3. Run the full stack
```bash
# Starts frontend, backend API, arq worker, and Electron — all concurrently
npm run dev
```

Or run services individually:
```bash
npm run dev:frontend   # Next.js on :3000
npm run dev:backend    # FastAPI on :8000 with --reload
npm run dev:worker     # arq synthesis worker (watches app/)
npm run dev:electron   # Electron (waits for :3000 to be ready)
```

### 4. Initialize the database
```bash
cd apps/backend
python init_db.py
```

---

## 📚 Documentation

| Document | Audience |
|---|---|
| [System Architecture](./docs/developer/architecture.md) | Developers |
| [Research Synthesis Engine](./docs/developer/research-synthesis.md) | AI / Backend engineers |
| [Agent Reference](./apps/backend/AGENTS.md) | AI / Backend engineers |
| [Node Types Reference](./apps/backend/NODES.md) | Full-stack developers |
| [Deployment Guide](./docs/developer/deployment-guide.md) | DevOps |
| [Auth Setup](./docs/developer/auth-setup.md) | Developers |
| [User Guide](./docs/public/system-guide.md) | End users |

---

## 📦 Building for Production

```bash
# Build frontend + backend binary + Electron installer
npm run package
```

Produces signed installers in `apps/desktop/dist/`.

---

## 🗂️ Frontend Structure

```
apps/frontend/
├── app/                    Next.js App Router pages
├── components/
│   ├── canvas/             Graph canvas — CanvasView, node types, overlays
│   ├── browser/            Electron webview browser integration
│   ├── synthesis/          Synthesis modal + progress UI
│   ├── modals/             ASTEditorModal, ResearchPdfModal, TemplateModal…
│   └── ui/                 Shared UI: ContextMenu, buttons, etc.
├── hooks/
│   ├── useContextMenu.ts   Node / pane / edge right-click menus
│   ├── useConnectionDrop.ts  Drop-on-canvas node creation
│   ├── useFileDrop.ts      Drag-and-drop image/PDF → node
│   ├── useNodeCreation.ts  Toolbar node creation (note/group/text)
│   └── useSynthesis.ts     PDF synthesis + AST editor state
├── store/
│   ├── graph.store.ts      Zustand — nodes, edges, whiteboards, selectedNode
│   └── ast.store.ts        Zustand — document AST for editor
├── lib/
│   └── api.ts              Typed API client (nodes, edges, synthesis, files)
└── types/
    └── nodes.ts            TypeScript interfaces for all 15 node data types
```

---

*Cognode — AI-native research, synthesized.*
