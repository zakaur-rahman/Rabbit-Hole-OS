"""
Chat API Router — AI Chat with streaming responses and graph tool execution.
"""
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.v1.oauth import get_current_user
from app.models.user import User
from app.models.node import Node
from app.schemas.chat import ChatRequest, ConfirmActionRequest, UndoRequest
from app.services.graph_agent import GraphPlannerAgent, GraphExecutorAgent

router = APIRouter()
logger = logging.getLogger(__name__)

# Singleton planner agent
_planner = GraphPlannerAgent()


async def _stream_chat_response(
    request: ChatRequest,
    db: AsyncSession,
    current_user: User,
) -> AsyncGenerator[str, None]:
    """
    Generate a streaming SSE response for a chat message.
    """
    try:
        # 1. Gather graph context
        result = await db.execute(
            select(Node).where(
                Node.whiteboard_id == request.whiteboard_id,
                Node.user_id == current_user.id
            ).limit(50)
        )
        all_nodes_db = result.scalars().all()
        all_nodes = [
            {"id": n.id, "title": n.title, "type": n.type, "content": (n.content or "")[:300]}
            for n in all_nodes_db
        ]

        # 2. Build selected nodes context
        selected_nodes = []
        if request.selected_node_ids:
            for node_id in request.selected_node_ids:
                node_data = next((n for n in all_nodes if n["id"] == node_id), None)
                if node_data:
                    selected_nodes.append(node_data)

        # 3. Build conversation history
        history = [
            {"role": m.role.value, "content": m.content}
            for m in request.conversation_history[-6:]
        ]

        # 4. Call the planner agent
        yield f"data: {json.dumps({'type': 'message_start', 'content': ''})}\n\n"

        planner_response = await _planner.plan(
            message=request.message,
            whiteboard_id=request.whiteboard_id,
            selected_nodes=selected_nodes,
            conversation_history=history,
            all_nodes=all_nodes,
        )

        if planner_response.status != "success":
            error_msg = planner_response.reasoning or "Failed to process your request"
            yield f"data: {json.dumps({'type': 'message_delta', 'content': error_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'message_end'})}\n\n"
            return

        data = planner_response.data
        message_text = data.get("message", "")
        tool_calls = data.get("tool_calls", [])

        # 5. Stream the message text in chunks for a typing effect
        chunk_size = 8
        for i in range(0, len(message_text), chunk_size):
            chunk = message_text[i:i + chunk_size]
            yield f"data: {json.dumps({'type': 'message_delta', 'content': chunk})}\n\n"

        # 6. Execute tool calls
        if tool_calls:
            executor = GraphExecutorAgent(db, str(current_user.id), request.whiteboard_id)

            for tc in tool_calls:
                # Emit tool call event
                yield f"data: {json.dumps({'type': 'tool_call', 'tool_call': tc})}\n\n"

                # Execute (skip deletes — handled via confirmation)
                if tc.get("tool") == "deleteNode":
                    tc["status"] = "pending"
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool_result': {'success': True, 'data': {'requires_confirmation': True}}})}\n\n"
                else:
                    result = await executor.execute(tc)
                    tc["status"] = "executed" if result.get("success") else "failed"
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool_result': result})}\n\n"

        # 7. Signal end of message
        yield f"data: {json.dumps({'type': 'message_end'})}\n\n"

    except Exception as e:
        logger.error(f"Chat stream error: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to Cognode AI and receive a streaming SSE response.
    The AI will analyze the message, generate a response, and optionally
    execute graph mutations (create/link/update nodes).
    """
    return StreamingResponse(
        _stream_chat_response(request, db, current_user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/confirm")
async def confirm_action(
    request: ConfirmActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm or reject a pending AI action (e.g., node deletion).
    """
    if not request.confirmed:
        return {"success": True, "message": "Action rejected"}

    # For now, confirmations are handled client-side
    # The frontend will call removeNode directly after confirmation
    return {"success": True, "message": "Action confirmed"}


@router.post("/undo")
async def undo_action(
    request: UndoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Undo the last AI action for a whiteboard.
    Currently handled client-side via the undo stack.
    """
    return {"success": True, "message": "Undo processed"}
