# 👨‍💻 Cognode AI Agent: Developer Architecture

This document provides a technical deep dive into the Cognode AI Agent system, covering the interaction flow, data models, and tool-calling mechanics.

---

## 🏗 System Overview

Cognode AI uses a **Planner-Executor** architecture. The system translates natural language intent into deterministic graph operations.

### High-Level Flow
1. **User Input**: User sends a message via the `ChatPanel`.
2. **Context Injection**: The frontend gathers metadata (active whiteboard, selected node IDs, recent history).
3. **SSE Stream (FastAPI)**: The request is sent to `/v1/ai/message`. The backend initiates a Server-Sent Events (SSE) stream.
4. **Planner (LLM)**: The `GraphPlannerAgent` calls its LLM (Gemini 2.0 Flash) with a strictly formatted system prompt and current graph context.
5. **Tool Extraction**: The LLM returns a JSON response containing a natural language message and a list of `tool_calls`.
6. **Validation & Execution**: The `GraphExecutorAgent` processes the tool calls one by one against the PostgreSQL database.
7. **Frontend Sync**: The frontend receives chunks via SSE, updates the chat UI, and triggers re-fetches of nodes/edges as tools are executed.

---

## 🗺 Architecture Diagram (Textual)

```text
[ User Interface ] 
      |
      | (SSE Request: /ai/message)
      v
[ API Layer (FastAPI) ] <--- [ Auth / User Session ]
      |
      | (Context: Nodes, History, Selection)
      v
[ GraphPlannerAgent (LLM) ] <--- [ System Prompt / Rules ]
      |
      | (Planned ToolCalls Array)
      v
[ GraphExecutorAgent ] <--- [ Postgres DB / SQLAlchemy ]
      |
      | (Results: Success/Status)
      v
[ Frontend Store (Zustand) ] <--- [ Undo Stack / Local Storage ]
```

---

## 📦 Data Models

### Frontend (TypeScript) - `types/chat.ts`
```typescript
export interface ToolCall {
  id: string;
  tool: 'createNode' | 'updateNode' | 'deleteNode' | 'linkNodes' | 'searchNodes' | 'summarizeNode';
  args: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'executed' | 'rejected' | 'failed';
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    affectedIds?: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
}

export interface UndoEntry {
  id: string; // matches messageId
  reverseOps: ToolCall[]; // ops to reverse the action
  snapshot: any; // visual state backup
}
```

---

## ⚙️ Tool Definitions

The Agent uses the following tools to interact with the graph.

### 1. `createNode`
**Description**: Creates a new node on the canvas.
**Schema**:
```json
{
  "title": "string",
  "content": "string",
  "type": "note | article | code | article | academic",
  "position": { "x": "number", "y": "number" }
}
```

### 2. `linkNodes`
**Description**: Creates a directed edge between two nodes.
**Schema**:
```json
{
  "source_id": "string",
  "target_id": "string",
  "label": "string (optional)"
}
```

### 3. `deleteNode` (Dangerous)
**Description**: Deletes a node and all connected edges.
**Note**: Requires user confirmation before execution.
**Schema**: `{ "id": "string" }`

### 4. `searchNodes`
**Description**: Finds nodes based on semantic intent.
**Schema**: `{ "query": "string" }`

---

## 🧠 AI Agent Flow Details

The `GraphPlannerAgent` follows this strict cycle:

1. **Prompt Sanitization**: Validates the user message length and sanitizes inputs.
2. **In-Context Injection**: 
    - Selected Nodes (Titles + Content previews).
    - Existing Graph Structure (Summarized list of IDs/Titles).
    - Conversation History (Last 6 turns).
3. **LLM Inference**: Calls the LLM with `temperature: 0.3` to ensure high accuracy in tool argument generation.
4. **JSON Parsing**: Strictly parses the LLM output. If the JSON is malformed, uses a retry logic with a corrective prompt.

---

## 🔌 API Reference

### `POST /v1/ai/message` (Streaming)
Sends a message to the agent. Returns an SSE stream.
**Payload:**
```json
{
  "message": "Create a mind map about space",
  "whiteboard_id": "uuid",
  "selected_node_ids": ["id1", "id2"],
  "conversation_history": [...]
}
```

### `POST /v1/ai/confirm`
Confirms a pending tool call stored in the user's session.

---

## 🛠 Extensibility

### Adding a New Tool
1. **Define the Tool**: Add the tool name and description to `GRAPH_AGENT_SYSTEM_PROMPT` in `graph_agent.py`.
2. **Implement Execution**: Add a handler method in `GraphExecutorAgent` (e.g., `_my_new_tool(self, args)`).
3. **Register Route**: If it's a standalone action, add it to the `Executor.execute` switch statement.
4. **Update Frontend**: Update `ToolCall` types and UI result handlers in `ChatPanel.tsx`.

---

## 📁 Folder Structure (AI Focus)

```text
 Rabbit-Hole-OS
 ├── apps
 │   ├── backend
 │   │   └── app
 │   │       ├── api/v1/chat.py      # API Routers
 │   │       ├── services/graph_agent.py # Core Agent Logic
 │   │       └── schemas/chat.py     # Pydantic Models
 │   └── frontend
 │       ├── components/ai-chat/     # Chat UI Components
 │       ├── store/chat.store.ts      # Zustand State
 │       └── types/chat.ts           # TS Interfaces
```
