"""
Graph AI Agent — Planner + Executor for graph-level AI operations.

This agent understands natural language requests and translates them into
graph mutation tool calls (createNode, linkNodes, deleteNode, etc.).

Built on the existing BaseAgent infrastructure from agents.py.
"""
import logging
import uuid
from typing import List, Dict, Any, Optional

from app.services.agents import BaseAgent, AgentResponse

logger = logging.getLogger(__name__)

# ─── System Prompt ──────────────────────────────────────────────────────────────

GRAPH_AGENT_SYSTEM_PROMPT = """You are Cognode AI — an intelligent assistant inside a graph-based knowledge system.

Your goal is to help users think, organize ideas, and build structured knowledge graphs.

## CAPABILITIES
You can perform these actions by returning tool calls:
- createNode: Create a new knowledge node (title, content, type)
- updateNode: Update an existing node's title or content
- deleteNode: Delete a node (ALWAYS ask for confirmation first)
- linkNodes: Create an edge between two nodes with a relationship label
- unlinkNodes: Remove an edge between two nodes
- searchNodes: Find nodes by semantic similarity
- summarizeNode: Condense a node's content (or a set of nodes) into a new summary node

## NODE TYPES
Available types: article, note, code, academic, product, video, text, image, pdf, group

## BEHAVIOR RULES
1. When creating multiple nodes, space them apart (increment y by 150 for each)
2. When expanding an idea, create 3-7 sub-nodes and link them to the parent
3. MULTI-NODE SYNTHESIS: If multiple nodes are selected, prioritize looking for patterns or contradictions between them.
4. If asked to "summarize" a selection, create ONE new node of type 'note' and link it to all original sources with the label "summarizes".
5. Always provide meaningful titles and concise content
6. For delete operations, mention the node name and ask for confirmation
7. Think in graph structures — nodes are concepts, edges are relationships

## OUTPUT FORMAT
You MUST respond with valid JSON in this exact format:
{
  "message": "Your natural language response to the user",
  "tool_calls": [
    {
      "tool": "createNode",
      "args": {
        "title": "Node Title",
        "content": "Node content",
        "type": "note",
        "position": {"x": 200, "y": 200}
      }
    }
  ]
}

If no actions are needed, return an empty tool_calls array:
{
  "message": "Your response here",
  "tool_calls": []
}

IMPORTANT: Always respond with valid JSON. No markdown, no preamble.
"""

# ─── Graph Planner Agent ─────────────────────────────────────────────────────────

class GraphPlannerAgent(BaseAgent):
    """
    Understands user intent and generates a plan of tool calls
    to manipulate the knowledge graph.
    """

    def __init__(self):
        super().__init__("GraphPlanner", "Knowledge Graph AI Planner")

    async def plan(
        self,
        message: str,
        whiteboard_id: str,
        selected_nodes: List[Dict[str, Any]],
        conversation_history: List[Dict[str, str]],
        all_nodes: Optional[List[Dict[str, Any]]] = None,
    ) -> AgentResponse:
        """
        Process a user message and return a plan of actions.
        """
        try:
            message = self._validate_input(message, "message", min_length=1, max_length=2000)

            # Build context from selected nodes
            context_parts = []
            if selected_nodes:
                context_parts.append("SELECTED NODES (user has these selected on canvas):")
                for node in selected_nodes[:10]:
                    context_parts.append(f"  - ID: {node.get('id', 'unknown')}")
                    context_parts.append(f"    Title: {node.get('title', 'Untitled')}")
                    context_parts.append(f"    Type: {node.get('type', 'note')}")
                    content_preview = (node.get('content', '') or '')[:200]
                    if content_preview:
                        context_parts.append(f"    Content: {content_preview}")

            if all_nodes:
                context_parts.append(f"\nEXISTING NODES ON CANVAS ({len(all_nodes)} total):")
                for node in all_nodes[:30]:
                    context_parts.append(f"  - [{node.get('id', '')}] {node.get('title', 'Untitled')} (type: {node.get('type', '?')})")

            context = "\n".join(context_parts) if context_parts else "No nodes on canvas yet."

            # Build conversation history
            history_text = ""
            if conversation_history:
                history_text = "\nRECENT CONVERSATION:\n"
                for msg in conversation_history[-6:]:
                    role = msg.get("role", "user").upper()
                    content = msg.get("content", "")[:300]
                    history_text += f"  {role}: {content}\n"

            prompt = f"""{context}
{history_text}
USER MESSAGE: {message}

Respond with JSON containing "message" and "tool_calls" fields.
"""

            raw_response = await self._call_llm_with_retry(
                prompt,
                system_instruction=GRAPH_AGENT_SYSTEM_PROMPT,
                temperature=0.3
            )

            data = await self._parse_llm_json(raw_response, expected_keys=["message", "tool_calls"])

            # Ensure tool_calls have IDs
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                if "id" not in tc:
                    tc["id"] = f"tc-{uuid.uuid4().hex[:8]}"
                if "status" not in tc:
                    tc["status"] = "pending"

            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data,
                prompt=prompt,
                raw_response=raw_response
            )

        except Exception as e:
            logger.error(f"GraphPlanner failed: {e}", exc_info=True)
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={
                    "message": f"I encountered an error processing your request: {str(e)}",
                    "tool_calls": []
                },
                reasoning=str(e)
            )


# ─── Graph Executor Agent ────────────────────────────────────────────────────────

class GraphExecutorAgent:
    """
    Executes tool calls against the database.
    This is not an LLM agent — it's a deterministic executor.
    """

    def __init__(self, db_session, user_id: str, whiteboard_id: str):
        self.db = db_session
        self.user_id = user_id
        self.whiteboard_id = whiteboard_id
        self.logger = logging.getLogger("agent.graph_executor")

    async def execute(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single tool call and return the result."""
        tool = tool_call.get("tool", "")
        args = tool_call.get("args", {})

        try:
            if tool == "createNode":
                return await self._create_node(args)
            elif tool == "updateNode":
                return await self._update_node(args)
            elif tool == "deleteNode":
                return await self._delete_node(args)
            elif tool == "linkNodes":
                return await self._link_nodes(args)
            elif tool == "unlinkNodes":
                return await self._unlink_nodes(args)
            elif tool == "searchNodes":
                return await self._search_nodes(args)
            elif tool == "expandNode":
                return await self._expand_node(args)
            elif tool == "summarizeNode":
                return await self._summarize_node(args)
            else:
                return {"success": False, "error": f"Unknown tool: {tool}"}
        except Exception as e:
            self.logger.error(f"Tool execution failed [{tool}]: {e}")
            return {"success": False, "error": str(e)}

    async def _create_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new node in the database."""
        from app.models.node import Node

        node_id = args.get("id") or f"ai-{uuid.uuid4().hex[:8]}"
        position = args.get("position", {"x": 200, "y": 200})

        node = Node(
            id=node_id,
            type=args.get("type", "note"),
            title=args.get("title", "Untitled"),
            content=args.get("content", ""),
            url=args.get("url", ""),
            whiteboard_id=self.whiteboard_id,
            user_id=self.user_id,
            metadata_={
                "created_by": "ai",
                "position": position,
            }
        )
        self.db.add(node)
        await self.db.commit()
        await self.db.refresh(node)

        return {
            "success": True,
            "data": {
                "id": node.id,
                "title": node.title,
                "type": node.type,
                "position": position,
            },
            "affectedIds": [node.id],
        }

    async def _update_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing node."""
        from app.models.node import Node
        from sqlalchemy import select

        node_id = args.get("id")
        if not node_id:
            return {"success": False, "error": "Node ID required"}

        result = await self.db.execute(
            select(Node).where(Node.id == node_id, Node.user_id == self.user_id)
        )
        node = result.scalar_one_or_none()
        if not node:
            return {"success": False, "error": f"Node {node_id} not found"}

        if "title" in args:
            node.title = args["title"]
        if "content" in args:
            node.content = args["content"]

        await self.db.commit()
        return {
            "success": True,
            "data": {"id": node.id, "title": node.title},
            "affectedIds": [node.id],
        }

    async def _delete_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a node."""
        from app.models.node import Node
        from app.models.edge import Edge
        from sqlalchemy import select, delete, or_

        node_id = args.get("id")
        if not node_id:
            return {"success": False, "error": "Node ID required"}

        result = await self.db.execute(
            select(Node).where(Node.id == node_id, Node.user_id == self.user_id)
        )
        node = result.scalar_one_or_none()
        if not node:
            return {"success": False, "error": f"Node {node_id} not found"}

        # Delete connected edges first
        await self.db.execute(
            delete(Edge).where(or_(Edge.source_id == node_id, Edge.target_id == node_id))
        )
        await self.db.delete(node)
        await self.db.commit()

        return {
            "success": True,
            "data": {"id": node_id, "deleted": True},
            "affectedIds": [node_id],
        }

    async def _link_nodes(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create an edge between two nodes."""
        from app.models.edge import Edge

        source_id = args.get("source_id")
        target_id = args.get("target_id")
        if not source_id or not target_id:
            return {"success": False, "error": "source_id and target_id required"}

        edge_id = f"ai-e-{uuid.uuid4().hex[:8]}"
        edge = Edge(
            id=edge_id,
            source_id=source_id,
            target_id=target_id,
            label=args.get("label"),
            whiteboard_id=self.whiteboard_id,
            user_id=self.user_id,
        )
        self.db.add(edge)
        await self.db.commit()

        return {
            "success": True,
            "data": {"id": edge_id, "source_id": source_id, "target_id": target_id},
            "affectedIds": [edge_id],
        }

    async def _unlink_nodes(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Remove an edge between two nodes."""
        from app.models.edge import Edge
        from sqlalchemy import select, and_

        source_id = args.get("source_id")
        target_id = args.get("target_id")
        if not source_id or not target_id:
            return {"success": False, "error": "source_id and target_id required"}

        result = await self.db.execute(
            select(Edge).where(
                and_(Edge.source_id == source_id, Edge.target_id == target_id)
            )
        )
        edge = result.scalar_one_or_none()
        if edge:
            await self.db.delete(edge)
            await self.db.commit()
            return {"success": True, "data": {"deleted_edge_id": edge.id}}

        return {"success": False, "error": "Edge not found"}

    async def _search_nodes(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Search nodes by title (basic text search for now, pgvector later)."""
        from app.models.node import Node
        from sqlalchemy import select

        query = args.get("query", "")
        result = await self.db.execute(
            select(Node).where(
                Node.whiteboard_id == self.whiteboard_id,
                Node.user_id == self.user_id,
                Node.title.ilike(f"%{query}%")
            ).limit(10)
        )
        nodes = result.scalars().all()

        return {
            "success": True,
            "data": {
                "results": [
                    {"id": n.id, "title": n.title, "type": n.type}
                    for n in nodes
                ],
                "count": len(nodes),
            },
        }

    async def _expand_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Placeholder — expansion is handled by the planner generating multiple createNode calls."""
        return {
            "success": True,
            "data": {"message": "Expansion handled by planner"},
        }

    async def _summarize_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarize a node (or nodes). 
        The actual summarization is usually handled by the planner providing the summary content 
        in a createNode call, but this tool can be used to explicitly trigger a condensation.
        """
        node_id = args.get("id")
        if not node_id:
            return {"success": False, "error": "Node ID required"}
            
        # For now, we return a success signal. 
        # Future: Trigger a deep LLM distillation task.
        return {
            "success": True,
            "data": {"message": "Summarization task initiated"},
            "affectedIds": [node_id]
        }
