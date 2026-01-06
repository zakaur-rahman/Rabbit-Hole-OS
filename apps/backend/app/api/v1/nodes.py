from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from app.services.scraper import extract_content, detect_content_type
from app.services.embeddings import get_embedding
from app.services.outline import analyze_url, extract_outline
from app.schemas.node import NodeCreate, Node as NodeSchema
from pydantic import BaseModel
import uuid
import json
import os
from datetime import datetime

STORAGE_DIR = os.environ.get("STORAGE_DIR", "storage")
NODES_FILE = os.path.join(STORAGE_DIR, "nodes.json")

def load_nodes():
    if os.path.exists(NODES_FILE):
        try:
            with open(NODES_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading nodes: {e}")
    return {}

def save_nodes():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    try:
        with open(NODES_FILE, "w") as f:
            json.dump(nodes_store, f, indent=2)
    except Exception as e:
        print(f"Error saving nodes: {e}")

router = APIRouter()

# In-memory storage with file backup
nodes_store: dict = load_nodes()

class ProcessUrlResponse(BaseModel):
    id: str
    type: str
    url: str
    title: str
    content: str
    snippet: str
    created_at: str
    metadata: dict
    outline: Optional[List[dict]] = None

@router.post("/process_url", response_model=ProcessUrlResponse)
async def process_url(
    url: str = Query(..., description="URL to process"),
    whiteboard_id: Optional[str] = Query("main", description="Target whiteboard ID"),
    node_id: Optional[str] = Query(None, description="Optional ID of an existing node to update")
):
    """
    Analyze a URL using AI and create a node with content and outline.
    """
    # Check if already processed for this whiteboard (if no node_id provided)
    if not node_id:
        for node in nodes_store.values():
            if node.get("url") == url and node.get("metadata", {}).get("whiteboard_id") == whiteboard_id:
                return node
    
    target_id = node_id or str(uuid.uuid4())
    
    # Try AI-powered URL analysis first
    print(f"Analyzing URL with AI: {url}")
    try:
        ai_result = await analyze_url(url)
        
        if ai_result and ai_result.get("title") and ai_result.get("outline"):
            node = {
                "id": target_id,
                "type": "article",
                "url": url,
                "title": ai_result.get("title", "Untitled"),
                "content": ai_result.get("content", ""),
                "snippet": ai_result.get("snippet", ""),
                "created_at": nodes_store.get(target_id, {}).get("created_at") or datetime.utcnow().isoformat() + "Z",
                "metadata": {
                    **(nodes_store.get(target_id, {}).get("metadata", {})),
                    "whiteboard_id": whiteboard_id,
                    "analyzed_by": "ai"
                },
                "outline": ai_result.get("outline", [])
            }
            nodes_store[target_id] = node
            save_nodes()
            print(f"Successfully created node with AI analysis: {node['title']}")
            return node
    except Exception as e:
        print(f"AI analysis failed: {e}")
    
    # Fallback to scraper if AI fails
    print(f"Falling back to scraper for: {url}")
    extracted = await extract_content(url)
    
    if not extracted or not extracted.get("content"):
        # Return basic node even if extraction fails
        node = {
            "id": target_id,
            "type": detect_content_type(url),
            "url": url,
            "title": url.split("/")[-1].replace("_", " ").replace("-", " ").title() or "Web Page",
            "content": "",
            "snippet": "Set CHUTES_API_KEY or OPENAI_API_KEY for AI-powered content analysis",
            "created_at": nodes_store.get(target_id, {}).get("created_at") or datetime.utcnow().isoformat() + "Z",
            "metadata": {
                **(nodes_store.get(target_id, {}).get("metadata", {})),
                "whiteboard_id": whiteboard_id
            },
            "outline": []
        }
        nodes_store[target_id] = node
        save_nodes()
        return node
    
    content = extracted.get("content", "")
    node_type = extracted.get("content_type", "article")
    node_title = extracted.get("title", "Untitled")
    
    # Try to extract outline from scraped content
    outline = None
    if node_type == "article" and content:
        try:
            outline = await extract_outline(content, node_title)
            print(f"Extracted outline with {len(outline)} top-level sections")
        except Exception as e:
            print(f"Failed to extract outline: {e}")
            outline = None
    
    node = {
        "id": target_id,
        "type": node_type,
        "url": url,
        "title": node_title,
        "content": content,
        "snippet": extracted.get("snippet") or (content[:200] + "..." if len(content) > 200 else content),
        "created_at": nodes_store.get(target_id, {}).get("created_at") or datetime.utcnow().isoformat() + "Z",
        "metadata": {
            **(nodes_store.get(target_id, {}).get("metadata", {})),
            "author": extracted.get("author"),
            "date": extracted.get("date"),
            "description": extracted.get("description"),
            "whiteboard_id": whiteboard_id
        },
        "outline": outline
    }
    
    nodes_store[target_id] = node
    save_nodes()
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
    save_nodes()
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
    save_nodes()
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
    original_count = len(nodes)
    filtered = [n for n in nodes if n.get("metadata", {}).get("whiteboard_id", "main") == whiteboard_id]
    
    print(f"[DEBUG] list_nodes: whiteboard_id={whiteboard_id}, total_nodes={original_count}, returning={len(filtered)}")

    if type:
        filtered = [n for n in filtered if n.get("type") == type]
    
    return filtered[skip:skip + limit]

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
    save_nodes()
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
