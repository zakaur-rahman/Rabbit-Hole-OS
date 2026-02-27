from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.api.v1.oauth import get_current_user, User
from sqlalchemy.ext.asyncio import AsyncSession
import random

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str

class ProjectResponse(BaseModel):
    id: str
    name: str
    node_count: int
    last_synced_at: str
    sync_status: str

# In-memory mock storage keyed by user_id to simulate persistence
_mock_projects_db = {}

def get_user_projects(user_id: str):
    if user_id not in _mock_projects_db:
        # Seed initial data
        _mock_projects_db[user_id] = [
            {
                "id": str(uuid.uuid4()),
                "name": "General Research",
                "node_count": random.randint(10, 50),
                "last_synced_at": datetime.utcnow().isoformat() + "Z",
                "sync_status": "synced"
            }
        ]
    return _mock_projects_db[user_id]


@router.get("/me", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List mock projects"""
    return get_user_projects(str(current_user.id))

@router.post("", response_model=ProjectResponse)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a mock project"""
    user_id = str(current_user.id)
    projects = get_user_projects(user_id)

    new_project = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "node_count": 0,
        "last_synced_at": datetime.utcnow().isoformat() + "Z",
        "sync_status": "synced"
    }
    projects.append(new_project)

    return new_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a mock project"""
    user_id = str(current_user.id)
    projects = get_user_projects(user_id)

    _mock_projects_db[user_id] = [p for p in projects if p["id"] != project_id]
    return None

@router.post("/{project_id}/sync", response_model=dict)
async def sync_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger mock sync"""
    user_id = str(current_user.id)
    projects = get_user_projects(user_id)

    for p in projects:
        if p["id"] == project_id:
            p["last_synced_at"] = datetime.utcnow().isoformat() + "Z"
            return {"status": "success"}

    raise HTTPException(status_code=404, detail="Project not found")
