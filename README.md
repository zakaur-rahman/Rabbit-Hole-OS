# Cognode

Cognode is an advanced research and knowledge management platform that leverages multi-agent AI systems to provide high-fidelity synthesis, automated literature reviews, and visual knowledge mapping.

## 🚀 Key Features

- **Multi-Agent Research Synthesis**: A state-of-the-art engine that orchestrates specialized AI agents to generate academic-grade research reports.
- **Dynamic Knowledge Graph**: Visualize relationships between documents, concepts, and research findings in real-time.
- **Enterprise-Grade Security**: Secure authentication via Clerk and PKCE-protected Google OAuth.
- **Intelligent LaTeX Compilation**: Automatic conversion of research ASTs into beautiful, production-ready PDFs with smart error recovery.
- **Universal Knowledge Memory**: Cross-document learning that allows the platform to build a cumulative knowledge base for the user.

## 🏗️ Architecture

The project is built as a monorepo with the following components:

- **Apps**
  - `apps/frontend`: Next.js web application for the primary user interface.
  - `apps/backend`: FastAPI server providing the core intelligence and agent orchestration.
  - `apps/desktop`: (WIP) Electron wrapper for a native desktop experience.
- **Packages**
  - Shared utilities and core models used across the application.

## 🧠 Research Synthesis Engine

The heart of Cognode is its **Research Synthesis Engine**, which features:

- **Deterministic Caching**: Identical research queries are identified via SHA256 prompt hashing and served instantly from the cache.
- **Agent Isolation**: Background execution using `arq` and Redis ensures reliable, isolated processing for long-running research tasks.
- **Versioning & Branching**: Full document history tracking, allowing users to evolve their research across multiple synthesis iterations.
- **Persistent State Machine**: Real-time status updates and fault-tolerant job resumption.

For detailed technical documentation, see the **[Research Synthesis Guide](./docs/RESEARCH_SYNTHESIS.md)**.

## 📋 Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon recommended)
- Redis Server (or Upstash for cloud)

### Setup

1. **Clone the repository**
2. **Setup Backend**: Follow the instructions in `apps/backend/README.md`.
3. **Setup Frontend**: Follow the instructions in `apps/frontend/README.md`.
4. **Configure Authentication**: See the **[Auth Documentation](./docs/README.md)**.

## 📚 Documentation

The Cognode documentation is divided into **User** and **Developer** tracks.

- **[Documentation Center](./docs/README.md)**: The central hub for all platform documentation.
- **[Public System Guide](./docs/public/system-guide.md)**: Deep dive into the platform philosophy and user workflows.
- **[Technical Architecture](./docs/developer/architecture.md)**: High-level system design and execution flows.
- **[Research Synthesis Guide](./docs/developer/research-synthesis.md)**: Deep dive into the multi-agent execution pipeline.

---
*Built with ❤️ by the Google Deepmind team for Advanced Agentic Coding*
