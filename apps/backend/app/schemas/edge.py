from pydantic import BaseModel
from typing import Optional, Dict, Any

class EdgeBase(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = "default"
    animated: Optional[bool] = False
    style: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None

class EdgeCreate(EdgeBase):
    pass

class Edge(EdgeBase):
    whiteboard_id: str

    class Config:
        from_attributes = True
