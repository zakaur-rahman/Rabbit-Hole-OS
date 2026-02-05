from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import List, Optional
from app.services.scraper import extract_content, detect_content_type
from app.services.embeddings import get_embedding
from app.services.outline import analyze_url, extract_outline
from app.schemas.node import NodeCreate, Node as NodeSchema
from app.models.node import Node
from app.models.whiteboard import Whiteboard
from app.core.database import get_db
from app.api.v1.oauth import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc, or_
from app.models.edge import Edge
from pydantic import BaseModel
from app.models.user import User
import uuid
import json
import os
from datetime import datetime

router = APIRouter()

class ProcessUrlResponse(BaseModel):
    id: str
    type: str
    url: str
    title: str
    content: Optional[str] = None
    snippet: Optional[str] = None
    created_at: datetime
    metadata: Optional[dict] = {}
    outline: Optional[List[dict]] = None

@router.post("/process_url", response_model=ProcessUrlResponse)
async def process_url(
    url: str = Query(..., description="URL to process"),
    whiteboard_id: Optional[str] = Query("main", description="Target whiteboard ID"),
    node_id: Optional[str] = Query(None, description="Optional ID of an existing node to update"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze a URL using AI and create a node with content and outline.
    """
    # Ensure whiteboard exists (Safe Get-or-Create)
    wb_result = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard_id, Whiteboard.user_id == current_user.id))
    wb = wb_result.scalar_one_or_none()
    if not wb:
        try:
            wb = Whiteboard(id=whiteboard_id, name=f"Board {whiteboard_id}", user_id=current_user.id)
            db.add(wb)
            await db.commit()
            print(f"Created whiteboard '{whiteboard_id}' for user {current_user.id}")
        except Exception:
            await db.rollback()
            # Retry fetch in case of parallel creation
            wb_result = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard_id))
            wb = wb_result.scalar_one_or_none()
            if not wb:
                raise HTTPException(status_code=500, detail="Failed to create/fetch whiteboard")

    # Check if already processed for this whiteboard (if no node_id provided)
    if not node_id:
        result = await db.execute(
            select(Node).where(Node.url == url, Node.whiteboard_id == whiteboard_id, Node.user_id == current_user.id)
        )
        existing_node = result.scalar_one_or_none()
        if existing_node:
            return existing_node
    
    target_id = node_id or str(uuid.uuid4())
    
    # Try AI-powered URL analysis first
    print(f"Analyzing URL with AI: {url}")
    try:
        ai_result = await analyze_url(url)
        
        if ai_result and ai_result.get("title") and ai_result.get("outline"):
            node_data = {
                "id": target_id,
                "type": "article",
                "url": url,
                "title": ai_result.get("title", "Untitled"),
                "content": ai_result.get("content", ""),
                "whiteboard_id": whiteboard_id,
                "user_id": current_user.id,
                "metadata_": {
                    "analyzed_by": "ai",
                    "snippet": ai_result.get("snippet", ""),
                    "outline": ai_result.get("outline", [])
                }
            }

            # Check if updating or creating
            existing_result = await db.execute(select(Node).where(Node.id == target_id, Node.user_id == current_user.id))
            existing_node = existing_result.scalar_one_or_none()

            if existing_node:
                for k, v in node_data.items():
                    setattr(existing_node, k, v)
                node = existing_node
            else:
                node = Node(**node_data)
                db.add(node)
                
            await db.commit()
            await db.refresh(node)
            print(f"Successfully created node with AI analysis: {node.title}")
            return _map_node_response(node)
    except Exception as e:
        print(f"AI analysis failed: {e}")
    
    # Fallback to scraper if AI fails
    print(f"Falling back to scraper for: {url}")
    try:
        extracted = await extract_content(url)
    except Exception as e:
        print(f"Scraper failed: {e}")
        extracted = {}

    content = extracted.get("content", "")
    detected_type = detect_content_type(url)
    node_type = extracted.get("content_type", detected_type or "article")
    node_title = extracted.get("title") or url.split("/")[-1].replace("_", " ").replace("-", " ").title() or "Web Page"
    
    # Try to extract outline from scraped content
    outline = None
    if node_type == "article" and content:
        try:
            outline = await extract_outline(content, node_title)
            print(f"Extracted outline with {len(outline)} sections")
        except Exception as e:
            print(f"Failed to extract outline: {e}")
            outline = None
    
    node_data = {
        "id": target_id,
        "type": node_type,
        "url": url,
        "title": node_title,
        "content": content,
        "whiteboard_id": whiteboard_id,
        "user_id": current_user.id,
        "metadata_": {
            "snippet": extracted.get("snippet") or (content[:200] + "..." if len(content) > 200 else content),
            "author": extracted.get("author"),
            "date": extracted.get("date"),
            "description": extracted.get("description"),
            "outline": outline
        }
    }

    # Upsert logic
    existing_result = await db.execute(select(Node).where(Node.id == target_id, Node.user_id == current_user.id))
    existing_node = existing_result.scalar_one_or_none()
    
    if existing_node:
        for k, v in node_data.items():
             if k != "id": setattr(existing_node, k, v)
        node = existing_node
    else:
        node = Node(**node_data)
        db.add(node)
    
    await db.commit()
    await db.refresh(node)
    return _map_node_response(node)

@router.post("/", response_model=ProcessUrlResponse)
async def create_node(
    node_data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a generic node.
    """
    node_id = node_data.get("id") or str(uuid.uuid4())
    whiteboard_id = node_data.get("whiteboard_id") or node_data.get("data", {}).get("whiteboard_id", "main")
    
    # Auto-create whiteboard if needed
    if whiteboard_id:
        wb_result = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard_id, Whiteboard.user_id == current_user.id))
        if not wb_result.scalar_one_or_none():
            if whiteboard_id == "main":
                db.add(Whiteboard(id="main", name="Main Board", user_id=current_user.id))
                await db.commit()
            else:
                 # Should we create it? Let's say yes for now to be permissive
                 db.add(Whiteboard(id=whiteboard_id, name="New Board", user_id=current_user.id))
                 await db.commit()

    content = node_data.get("content") or node_data.get("data", {}).get("content", "")
    metadata = node_data.get("data", {})
    if not isinstance(metadata, dict): metadata = {}
    
    # Check for existing node (Upsert logic to prevent duplicate key errors)
    existing_result = await db.execute(select(Node).where(Node.id == node_id, Node.user_id == current_user.id))
    existing_node = existing_result.scalar_one_or_none()
    
    node_fields = {
        "type": node_data.get("type", "article"),
        "url": node_data.get("url", ""),
        "title": node_title if (node_title := node_data.get("title")) else "Untitled",
        "content": content,
        "whiteboard_id": whiteboard_id,
        "user_id": current_user.id,
        "metadata_": {
            **metadata,
            "snippet": node_data.get("snippet", "") or (content[:200] + "..." if content else ""),
        }
    }

    if existing_node:
        # Update existing
        for key, value in node_fields.items():
            setattr(existing_node, key, value)
        new_node = existing_node
    else:
        # Create new
        new_node = Node(id=node_id, **node_fields)
        db.add(new_node)

    try:
        await db.commit()
        await db.refresh(new_node)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return _map_node_response(new_node)

@router.put("/{node_id}", response_model=ProcessUrlResponse)
async def update_node(
    node_id: str, 
    node_data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing node.
    """
    result = await db.execute(select(Node).where(Node.id == node_id, Node.user_id == current_user.id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Update regular fields
    if "title" in node_data: node.title = node_data["title"]
    if "type" in node_data: node.type = node_data["type"]
    if "url" in node_data: node.url = node_data["url"]
    if "content" in node_data: node.content = node_data["content"]
    
    # Update metadata
    current_meta = dict(node.metadata_) if node.metadata_ else {}
    if "data" in node_data: current_meta.update(node_data["data"])
    if "metadata" in node_data: current_meta.update(node_data["metadata"])
    node.metadata_ = current_meta
        
    await db.commit()
    await db.refresh(node)
    return _map_node_response(node)

@router.get("/", response_model=List[ProcessUrlResponse])
async def list_nodes(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    whiteboard_id: Optional[str] = "main",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all nodes, filtered by type and whiteboard."""
    from sqlalchemy.orm import defer
    
    # Optimize query: defer loading of large content and embedding fields for list views
    query = select(Node).where(Node.whiteboard_id == whiteboard_id, Node.user_id == current_user.id)
    query = query.options(defer(Node.content), defer(Node.embedding))
    
    if type:
        query = query.where(Node.type == type)
        
    query = query.offset(skip).limit(limit).order_by(Node.created_at)
    
    result = await db.execute(query)
    nodes = result.scalars().all()
    
    return [_map_node_response(n, include_content=False) for n in nodes]

@router.get("/{node_id}", response_model=ProcessUrlResponse)
async def get_node(node_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific node by ID."""
    result = await db.execute(select(Node).where(Node.id == node_id, Node.user_id == current_user.id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return _map_node_response(node)

@router.delete("/{node_id}")
async def delete_node(node_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a node."""
    result = await db.execute(select(Node).where(Node.id == node_id, Node.user_id == current_user.id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Step 1: Manually delete any edges referencing this node (failsafe for migration)
    await db.execute(delete(Edge).where(or_(Edge.source_id == node_id, Edge.target_id == node_id)))
    
    # Step 2: Delete the node
    await db.delete(node)
    await db.commit()
    return {"status": "deleted", "id": node_id}

@router.get("/{node_id}/related", response_model=List[ProcessUrlResponse])
async def get_related_nodes(node_id: str, limit: int = 5, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get nodes related to a specific node (by content similarity)."""
    # For now, just simplistic implementation
    # In production, use pgvector cosine similarity
    result = await db.execute(select(Node).where(Node.user_id == current_user.id).limit(limit))
    nodes = result.scalars().all()
    return [_map_node_response(n, include_content=False) for n in nodes]

def _map_node_response(node: Node, include_content: bool = True) -> dict:
    meta = node.metadata_ or {}
    data = {
        "id": node.id,
        "type": node.type,
        "url": node.url or "",
        "title": node.title,
        "snippet": meta.get("snippet", ""),
        "created_at": node.created_at,
        "metadata": {
            **meta,
            "whiteboard_id": node.whiteboard_id
        },
        "outline": meta.get("outline")
    }
    if include_content:
        data["content"] = node.content
    return data
