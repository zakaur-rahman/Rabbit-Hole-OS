from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from app.services.scraper import extract_content, detect_content_type
from app.services.embeddings import get_embedding
from app.schemas.node import NodeCreate, Node as NodeSchema
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter()

# In-memory storage (replace with database in production)
# This allows frontend to sync without needing PostgreSQL running
nodes_store: dict = {}

class ProcessUrlResponse(BaseModel):
    id: str
    type: str
    url: str
    title: str
    content: str
    snippet: str
    created_at: str
    metadata: dict

@router.post("/process_url", response_model=ProcessUrlResponse)
async def process_url(
    url: str = Query(..., description="URL to process"),
    whiteboard_id: Optional[str] = Query("main", description="Target whiteboard ID"),
    node_id: Optional[str] = Query(None, description="Optional ID of an existing node to update")
):
    """
    Fetch a URL, extract content, and create or update a node.
    """
    # Check if already processed for this whiteboard (if no node_id provided)
    if not node_id:
        for node in nodes_store.values():
            if node.get("url") == url and node.get("metadata", {}).get("whiteboard_id") == whiteboard_id:
                return node
    
    # Extract content
    extracted = await extract_content(url)
    
    target_id = node_id or str(uuid.uuid4())
    
    if not extracted or not extracted.get("content"):
        # Return basic node even if extraction fails
        node = {
            "id": target_id,
            "type": detect_content_type(url),
            "url": url,
            "title": url.split("/")[-1] or "Web Page",
            "content": "",
            "snippet": "Could not extract content",
            "created_at": nodes_store.get(target_id, {}).get("created_at") or datetime.utcnow().isoformat() + "Z",
            "metadata": {
                **(nodes_store.get(target_id, {}).get("metadata", {})),
                "whiteboard_id": whiteboard_id
            }
        }
        nodes_store[target_id] = node
        return node
    
    content = extracted.get("content", "")
    
    node = {
        "id": target_id,
        "type": extracted.get("content_type", "article"),
        "url": url,
        "title": extracted.get("title", "Untitled"),
        "content": content,
        "snippet": extracted.get("snippet") or (content[:200] + "..." if len(content) > 200 else content),
        "created_at": nodes_store.get(target_id, {}).get("created_at") or datetime.utcnow().isoformat() + "Z",
        "metadata": {
            **(nodes_store.get(target_id, {}).get("metadata", {})),
            "author": extracted.get("author"),
            "date": extracted.get("date"),
            "description": extracted.get("description"),
            "whiteboard_id": whiteboard_id
        }
    }
    
    nodes_store[target_id] = node
    return node

@router.post("/", response_model=ProcessUrlResponse)
async def create_node(node_data: dict = Body(...)):
    """
    Create a generic node.
    """
    node_id = node_data.get("id") or str(uuid.uuid4())
    
    # Validate type
    node_type = node_data.get("type", "article")
    
    # Extract content - handle both flat and nested data
    content = node_data.get("content") or node_data.get("data", {}).get("content", "")
    
    new_node = {
        "id": node_id,
        "type": node_type,
        "url": node_data.get("url", ""),
        "title": node_data.get("title", "Untitled"),
        "content": content,
        "snippet": node_data.get("snippet", "") or (content[:200] + "..." if content else ""),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "metadata": {
            **node_data.get("data", {}),
            "whiteboard_id": node_data.get("whiteboard_id") or node_data.get("data", {}).get("whiteboard_id", "main")
        }
    }
    
    # Ensure metadata is dict
    if not isinstance(new_node["metadata"], dict):
        new_node["metadata"] = {}
        
    nodes_store[node_id] = new_node
    return new_node

@router.put("/{node_id}", response_model=ProcessUrlResponse)
async def update_node(node_id: str, node_data: dict = Body(...)):
    """
    Update an existing node.
    """
    if node_id not in nodes_store:
        raise HTTPException(status_code=404, detail="Node not found")
    
    existing_node = nodes_store[node_id]
    
    # Update fields if provided
    if "title" in node_data:
        existing_node["title"] = node_data["title"]
    if "type" in node_data:
        existing_node["type"] = node_data["type"]
    if "url" in node_data:
        existing_node["url"] = node_data["url"]
    if "content" in node_data:
        existing_node["content"] = node_data["content"]
        existing_node["snippet"] = node_data["content"][:200] + "..." if len(node_data["content"]) > 200 else node_data["content"]
    
    # Update metadata
    if "data" in node_data:
        existing_node["metadata"].update(node_data["data"])
    if "metadata" in node_data:
        existing_node["metadata"].update(node_data["metadata"])
        
    nodes_store[node_id] = existing_node
    return existing_node

@router.get("/", response_model=List[ProcessUrlResponse])
async def list_nodes(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    whiteboard_id: Optional[str] = "main"
):
    """Get all nodes, filtered by type and whiteboard."""
    nodes = list(nodes_store.values())
    
    # Filter by whiteboard (default to 'main' if not specified in node)
    # We treat nodes without whiteboard_id as 'main'
    nodes = [n for n in nodes if n.get("metadata", {}).get("whiteboard_id", "main") == whiteboard_id]
    
    if type:
        nodes = [n for n in nodes if n.get("type") == type]
    
    return nodes[skip:skip + limit]

@router.get("/{node_id}", response_model=ProcessUrlResponse)
async def get_node(node_id: str):
    """Get a specific node by ID."""
    node = nodes_store.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.delete("/{node_id}")
async def delete_node(node_id: str):
    """Delete a node."""
    if node_id not in nodes_store:
        raise HTTPException(status_code=404, detail="Node not found")
    del nodes_store[node_id]
    return {"status": "deleted", "id": node_id}

@router.get("/{node_id}/related", response_model=List[ProcessUrlResponse])
async def get_related_nodes(node_id: str, limit: int = 5):
    """Get nodes related to a specific node (by content similarity)."""
    node = nodes_store.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Simple content-based matching (would use embeddings in production)
    title_words = set(node.get("title", "").lower().split())
    
    related = []
    for other_id, other_node in nodes_store.items():
        if other_id == node_id:
            continue
        other_words = set(other_node.get("title", "").lower().split())
        overlap = len(title_words & other_words)
        if overlap > 0:
            related.append((overlap, other_node))
    
    related.sort(key=lambda x: x[0], reverse=True)
    return [node for _, node in related[:limit]]
