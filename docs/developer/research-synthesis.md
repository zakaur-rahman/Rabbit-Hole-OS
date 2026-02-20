# Research Synthesis Engine Architecture

The Cognode Research Synthesis Engine is a production-grade, multi-agent runtime designed for high-fidelity academic synthesis. It leverages asynchronous workers, deterministic caching, and structured document schemas to provide a seamless research experience.

---

## 🏗️ Architecture Overview

The engine follows a **Master-Worker** architecture using FastAPI as the entry point and `arq` (Redis-based) for background job processing.

```mermaid
graph TD
    User((User)) -->|POST /research-ast| API[FastAPI Orchestrator]
    API -->|SHA256 hash check| RedisCache{Redis Cache}
    RedisCache -- Hit --> API
    RedisCache -- Miss --> DB[(Postgres)]
    DB -->|Create ResearchJob| Job[Job Instance]
    Job -->|Enqueue| Q[Redis Queue]
    Q -->|Process| Worker[arq Worker]

    subgraph "Agent Pipeline (Isolation)"
        Worker --> P[1. PlannerAgent]
        P --> W[2. WriterAgent]
        W --> R[3. ReviewerAgent]
        R --> C[4. ChartFigureAgent]
        C --> B[5. BibNormalizerAgent]
        B --> Comp[6. CompilationTask]
        Comp --> M[7. MemoryAgent]
    end

    Worker -->|Update job status| DB
    DB -->|Publish| PubSub[Redis Pub/Sub]
    PubSub -->|SSE stream| API
    API -->|SSE| User
```

---

## 🧠 Specialized Agents

The engine orchestrates 7 specialized agents, each with a rigid JSON contract:

| # | Agent | Progress | Fatal? | Key Output |
|---|---|---|---|---|
| 1 | **PlannerAgent** | 20% | No | Document outline, section plan |
| 2 | **WriterAgent** | 40% | **Yes** | Document AST (JSON) |
| 3 | **ReviewerAgent** | 60% | No | Validated + corrected AST |
| 4 | **ChartFigureAgent** | 75% | No | Figure/chart recommendations |
| 5 | **BibNormalizerAgent** | 85% | No | Normalized bibliography |
| 6 | **CompilationTask** | 90% | No (since v0.2) | LaTeX source, PDF buffer |
| 7 | **MemoryAgent** | — | No | Cross-doc structural patterns |
| — | **RecoveryAgent** | — | No | Diagnoses LaTeX errors |

> Full agent documentation with JSON contracts and examples: [`AGENTS.md`](../../apps/backend/AGENTS.md)

---

## 🛡️ Core Features

### 1. Deterministic Caching
Uses SHA256 hashing of the user query, context items, and orchestrator version. If a matching completed job exists, results are served instantly.

### 2. Job Persistence & Observability
Every synthesis is a `ResearchJob` stored in PostgreSQL.
- **Granular Logging**: `JobLog` captures every agent's input/output for transparency.
- **State Machine**: Jobs transition through `IDLE`, `PLANNING`, `WRITING`, `REVIEWING`, `COMPILING`, and `COMPLETED`.

### 3. Asynchronous Isolation
By using Redis queues, the engine prevents long-running LLM calls from blocking the API. Each agent runs in its own worker step, ensuring system stability under load.

### 4. Smart Versioning
Supports full history tracking via `parent_job_id`. When a user regenerates or edits synthesis, a new version (e.g., `v1.0.1`) is branched from the previous one.

### 5. Non-Fatal Compilation (since v0.2)
If LaTeX compilation fails, the job still completes with `COMPLETED` status. The PDF step is skipped and the raw AST is returned. Users can open the ASTEditorModal to fix and recompile.

---

## Context Input: Node Types

Each canvas node type is chunked differently before reaching the agent pipeline:

| Node Type | Context Marker | WriterAgent Block |
|---|---|---|
| `article`, `web` | (plain text) | `paragraph` |
| `academic` | `[ACADEMIC_PAPER]` | Formal citation |
| `image` | `[IMAGE]` | `figure` |
| `code` | `[CODE:<lang>]` | `code_block` |
| `note`, `text` | `[RESEARCHER_NOTE]` | `quote` |
| `product` | `[PRODUCT]` | `table` |
| `canvas` | `[SUB_CANVAS]` | Section heading |
| `group` | `[GROUP]` | Thematic section heading |

> Full reference: [`NODES.md`](../../apps/backend/NODES.md)

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/synthesis/research-ast` | POST | Start synthesis job (SSE stream) |
| `/api/v1/synthesis/pdf-from-ast` | POST | Compile DocumentAST → PDF blob |
| `/api/v1/synthesis/latex-from-ast` | POST | Convert AST → LaTeX source |
| `/api/v1/synthesis/validate-ast` | POST | Validate AST before compilation |
| `/api/v1/synthesis/compile-raw-latex` | POST | Compile raw LaTeX string → PDF |

---

## 🛠️ Setup & Execution

### Prerequisites
- Redis (local or Upstash)
- `tectonic.exe` (bundled in `apps/backend/`) or `pdflatex` on PATH

### Running the Worker
```bash
# From project root
npm run dev:worker

# Or directly from apps/backend
python run_worker.py app.workers.synthesis_worker.WorkerSettings --watch app
```

### Configuration
Variables in `apps/backend/.env`:
```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/cognode
GEMINI_API_KEY=your_key          # Primary LLM provider
HF_TOKEN=                         # Fallback (Hugging Face)
CHUTES_API_KEY=                   # Fallback (DeepSeek V3)
OPENAI_API_KEY=                   # Fallback (GPT-4o)
```

If no LLM keys are configured, the system uses a **Mock provider** that returns `"{}"` — useful for testing pipeline scaffolding.

---

## 🧪 Verification
```bash
# From project root (PowerShell)
$env:PYTHONPATH="apps/backend"; python verify_engine.py
```

---

*Documentation Version: 1.1.0 — Last updated: 2026-02-20*
