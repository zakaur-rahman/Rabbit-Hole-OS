from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.whiteboard import Whiteboard
from app.api.v1.oauth import get_current_user
from app.models.user import User
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

router = APIRouter()

class WhiteboardBase(BaseModel):
    id: str
    name: str

class WhiteboardSchema(WhiteboardBase):
    pass

@router.get("/", response_model=List[WhiteboardSchema])
async def list_whiteboards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all whiteboards for the current user."""
    query = select(Whiteboard).where(Whiteboard.user_id == current_user.id)
    result = await db.execute(query)
    whiteboards = result.scalars().all()
    return whiteboards

@router.post("/", response_model=WhiteboardSchema)
async def create_whiteboard(
    whiteboard: WhiteboardBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new whiteboard."""
    # Check if exists
    result = await db.execute(select(Whiteboard).where(Whiteboard.id == whiteboard.id, Whiteboard.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing:
        return existing
        
    new_wb = Whiteboard(
        id=whiteboard.id,
        name=whiteboard.name,
        user_id=current_user.id
    )
    db.add(new_wb)
    await db.commit()
    await db.refresh(new_wb)
    return new_wb
