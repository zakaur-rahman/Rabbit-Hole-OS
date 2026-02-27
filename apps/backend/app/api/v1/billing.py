from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any

from app.core.database import get_db
from app.api.v1.oauth import get_current_user, User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class MockStripeResponse(BaseModel):
    url: str

@router.post("/create-checkout-session", response_model=MockStripeResponse)
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mock Stripe Checkout Endpoint
    """
    # In a real app, this generates a Stripe Checkout URL based on user context
    mock_stripe_url = f"https://checkout.stripe.com/c/pay/cs_mock_{current_user.id}"
    return {"url": mock_stripe_url}

@router.post("/portal", response_model=MockStripeResponse)
async def create_portal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mock Stripe Customer Portal Endpoint
    """
    # In a real app, this generates a Customer Portal URL
    mock_portal_url = f"https://billing.stripe.com/p/session/mock_{current_user.id}"
    return {"url": mock_portal_url}
