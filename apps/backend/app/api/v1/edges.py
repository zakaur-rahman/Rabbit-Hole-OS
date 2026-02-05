from fastapi import APIRouter, HTTPException, Query, Depends, Body
from typing import List, Dict, Optional
from app.schemas.edge import Edge as EdgeSchema, EdgeCreate
from app.models.edge import Edge
from app.models.node import Node
from app.models.whiteboard import Whiteboard
from app.models.user import User
from app.api.v1.oauth import get_current_user
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

router = APIRouter()

@router.get("/", response_model=List[EdgeSchema])
async def list_edges(
    whiteboard_id: str = Query(..., description="The ID of the whiteboard"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all edges for a specific whiteboard."""
    query = select(Edge).where(Edge.whiteboard_id == whiteboard_id, Edge.user_id == current_user.id)
    result = await db.execute(query)
    edges = result.scalars().all()
    
    return [EdgeSchema(
        id=e.id,
        source=e.source_id,
        target=e.target_id,
        label=e.label,
        whiteboard_id=e.whiteboard_id
    ) for e in edges]

@router.post("/", response_model=EdgeSchema)
async def create_edge(
    edge: EdgeCreate, 
    whiteboard_id: str = Query(..., description="The ID of the whiteboard"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update an edge."""
    # Ensure whiteboard exists (Safe Get-or-Create)
    wb_result = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard_id, Whiteboard.user_id == current_user.id))
    if not wb_result.scalar_one_or_none():
         try:
             db.add(Whiteboard(id=whiteboard_id, name=f"Board {whiteboard_id}", user_id=current_user.id))
             await db.commit()
             print(f"Created whiteboard '{whiteboard_id}' for user {current_user.id}")
         except Exception:
             await db.rollback()
             # Someone else might have created it
             wb_check = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard_id, Whiteboard.user_id == current_user.id))
             if not wb_check.scalar_one_or_none():
                 raise HTTPException(status_code=500, detail="Failed to create/fetch whiteboard")

    # Verify source and target nodes exist to avoid IntegrityError (500)
    source_check = await db.execute(select(Node).where(Node.id == edge.source, Node.user_id == current_user.id))
    if not source_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Source node {edge.source} not found")
        
    target_check = await db.execute(select(Node).where(Node.id == edge.target, Node.user_id == current_user.id))
    if not target_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Target node {edge.target} not found")

    new_edge = Edge(
        id=edge.id,
        source_id=edge.source,
        target_id=edge.target,
        label=edge.label,
        whiteboard_id=whiteboard_id,
        user_id=current_user.id
    )
    
    # Check if exists (Upsert logic)
    existing_result = await db.execute(select(Edge).where(Edge.id == edge.id, Edge.user_id == current_user.id))
    existing_edge = existing_result.scalar_one_or_none()
    if existing_edge:
        # Update existing
        existing_edge.source_id = edge.source
        existing_edge.target_id = edge.target
        existing_edge.label = edge.label
        existing_edge.whiteboard_id = whiteboard_id
        existing_edge.user_id = current_user.id
        new_edge = existing_edge
    else:
        db.add(new_edge)
    
    try:
        await db.commit()
        await db.refresh(new_edge)
    except Exception as e:
        await db.rollback()
        print(f"FAILED to create/update edge {edge.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return EdgeSchema(
        id=new_edge.id,
        source=new_edge.source_id,
        target=new_edge.target_id,
        label=new_edge.label,
        whiteboard_id=new_edge.whiteboard_id
    )

@router.delete("/{edge_id}")
async def delete_edge(
    edge_id: str, 
    whiteboard_id: Optional[str] = Query(None, description="The ID of the whiteboard"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an edge."""
    query = select(Edge).where(Edge.id == edge_id, Edge.user_id == current_user.id)
    if whiteboard_id:
        query = query.where(Edge.whiteboard_id == whiteboard_id)
    
    result = await db.execute(query)
    edge = result.scalar_one_or_none()
    
    if edge:
        await db.delete(edge)
        await db.commit()
        return {"status": "success"}
    
    # If not found with whiteboard_id, try without it just to be sure if we can delete it
    if whiteboard_id:
        result = await db.execute(select(Edge).where(Edge.id == edge_id, Edge.user_id == current_user.id))
        edge = result.scalar_one_or_none()
        if edge:
            await db.delete(edge)
            await db.commit()
            return {"status": "success"}
    
    raise HTTPException(status_code=404, detail="Edge not found")
