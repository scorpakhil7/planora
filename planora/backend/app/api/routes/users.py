from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import ok
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.user import (
    PasswordChangeRequest,
    ProfileUpdate,
    TravelersUpdate,
    TravelPreferences,
)
from app.services.user_service import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.patch("/me")
async def update_profile(
    payload: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    user = await user_service.update_profile(session, user_id, payload)
    return ok(user.model_dump())


@router.put("/me/password")
async def change_password(
    payload: PasswordChangeRequest,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    await user_service.change_password(session, user_id, payload)
    return ok({"changed": True})


@router.put("/me/travelers")
async def update_travelers(
    payload: TravelersUpdate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    travelers = [t.model_dump() for t in payload.travelers]
    user = await user_service.update_travelers(session, user_id, travelers)
    return ok(user.model_dump())


@router.put("/me/travel-preferences")
async def update_travel_preferences(
    payload: TravelPreferences,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    prefs = payload.model_dump(exclude_none=True)
    user = await user_service.update_travel_preferences(session, user_id, prefs)
    return ok(user.model_dump())
