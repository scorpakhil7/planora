from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import ok
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.user import RefreshRequest, UserCreate, UserLogin
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup")
async def signup(payload: UserCreate, session: AsyncSession = Depends(get_db)):
    user = await auth_service.signup(session, payload)
    return ok(user.model_dump())


@router.post("/login")
async def login(payload: UserLogin, session: AsyncSession = Depends(get_db)):
    tokens = await auth_service.login(session, payload)
    return ok(tokens.model_dump())


@router.post("/refresh")
async def refresh(payload: RefreshRequest, session: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh(session, payload.refresh_token)
    return ok(tokens.model_dump())


@router.get("/me")
async def me(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    user = await auth_service.get_current_user(session, user_id)
    return ok(user.model_dump())
