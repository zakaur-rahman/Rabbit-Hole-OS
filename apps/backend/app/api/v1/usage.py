from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.oauth import get_current_user, User
from sqlalchemy.ext.asyncio import AsyncSession
import random

router = APIRouter()

class UsageResponse(BaseModel):
    nodes_count: int
    projects_count: int
    api_calls_month: int
    plan: str

@router.get("/me", response_model=UsageResponse)
async def get_my_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mock endpoint returning usage stats for the current user.
    """
    # For simulation, we return random but realistic usage thresholds
    return UsageResponse(
        nodes_count=random.randint(40, 95),
        projects_count=random.randint(1, 4),
        api_calls_month=random.randint(150, 480),
        plan="free"  # Tied to the same default we serve in /oauth/me
    )
