# Cognode Architecture Overview

Cognode is designed as a modular, scalable knowledge synthesis platform. This document outlines the high-level architecture across the frontend, backend, and infrastructure layers.

## 🏗️ System Components

### 1. Frontend (Next.js + ReactFlow)
The user interface is a dynamic canvas where users interact with knowledge nodes.
- **Canvas Orchestration**: Powered by `reactflow` for visualizing document relationships.
- **State Management**: Uses `zustand` for high-performance, predictable state across the graph.
- **Real-time Updates**: Consumes Server-Sent Events (SSE) from the backend to display agent progress.

### 2. Backend (FastAPI + Arq)
The intelligence layer that manages data and executes research tasks.
- **API Strategy**: Stateless REST API with long-polling/streaming for heavy operations.
- **Agent Framework**: A custom multi-agent system where roles (Planner, Writer, Reviewer) are isolated.
- **Job Queue**: Utilizes `arq` and Redis to handle asynchronous research synthesis without blocking user interactions.

### 3. Desktop (Electron)
Provides a native experience with deeper system integration.
- **Browser Interop**: Custom handle for `cognode://` deep links for secure authentication.
- **Local Cache**: Potential future integration for offline knowledge nodes.

## 💾 Data Architecture

### Database (PostgreSQL)
- **Primary Persistence**: Stores users, whiteboards, nodes, and edges.
- **Execution History**: Stores `ResearchJob` and `JobLog` for auditability and recovery.

### Cache & Message Broker (Redis)
- **Distributed Lock/Queue**: Managed by `arq`.
- **Streaming**: Used for Pub/Sub updates of synthesis progress.

## 🔒 Security Model

- **Authentication**: JWT-based auth via Clerk and Google OAuth (PKCE compliant).
- **Data Isolation**: Multi-tenant design where resources are strictly isolated by `user_id` and `whiteboard_id`.
- **API Safety**: Strict mode enforcement for LaTeX compilation to prevent RCE.

## 🚀 Execution Flow: Multi-Agent Synthesis

1. **Request**: User triggers synthesis on the frontend.
2. **Orchestration**: Backend hashes the request and checks Redis for a cache hit.
3. **Tasking**: If no cache, a job is inserted into the DB and enqueued in Redis.
4. **Execution**: Arq workers pick up the job, executing the agent pipeline in isolation.
5. **Streaming**: Progress updates are published to Redis and streamed to the frontend via SSE.
6. **Completion**: Final AST is stored, compiled to PDF, and served to the user.

---
*Last Updated: 2026-01-31*
