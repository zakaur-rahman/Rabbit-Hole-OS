"""
Pydantic schemas for the AI Chat system.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationMessage(BaseModel):
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    message: str
    whiteboard_id: str = "main"
    selected_node_ids: List[str] = []
    conversation_history: List[ConversationMessage] = []


class ToolCallArgs(BaseModel):
    """Generic tool call arguments."""
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    id: Optional[str] = None
    source_id: Optional[str] = None
    target_id: Optional[str] = None
    label: Optional[str] = None
    query: Optional[str] = None
    position: Optional[Dict[str, float]] = None


class ToolCallSchema(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any]
    status: str = "pending"


class ConfirmActionRequest(BaseModel):
    action_id: str
    whiteboard_id: str
    confirmed: bool


class UndoRequest(BaseModel):
    whiteboard_id: str


class GenerateRequest(BaseModel):
    """Request schema for generic text generation (slash commands)."""
    prompt: str
    context: Optional[str] = None
    operation: Optional[str] = "generate"  # summarize, expand, fix_grammar, etc.
