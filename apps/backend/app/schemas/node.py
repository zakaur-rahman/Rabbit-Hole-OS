from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class NodeType(str, Enum):
    ARTICLE = "article"
    VIDEO = "video"
    SYNTHESIS = "synthesis"
    PDF = "pdf"
    NOTE = "note"
    GROUP = "group"
    TEXT = "text"
    PRODUCT = "product"
    CODE = "code"
    ACADEMIC = "academic"
    GHOST = "ghost"

class NodeBase(BaseModel):
    title: str
    url: Optional[str] = None
    type: NodeType
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NodeCreate(NodeBase):
    pass

class Node(NodeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
