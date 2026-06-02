from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse


class AuthService:
    """Handles signup, login, token refresh, and current-user resolution."""

    async def signup(self, session: AsyncSession, payload: UserCreate) -> UserResponse:
        existing = await session.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered.",
            )

        user = User(
            id=uuid.uuid4(),
            email=payload.email,
            name=payload.name,
            password_hash=hash_password(payload.password),
            preferences={},
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)
        return UserResponse(**user.to_dict())

    async def login(self, session: AsyncSession, payload: UserLogin) -> TokenResponse:
        user = await session.scalar(select(User).where(User.email == payload.email))
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated.",
            )

        subject = str(user.id)
        return TokenResponse(
            access_token=create_access_token(subject),
            refresh_token=create_refresh_token(subject),
        )

    async def refresh(self, session: AsyncSession, refresh_token: str) -> TokenResponse:
        user_id = decode_token(refresh_token, expected_type="refresh")
        user = await session.get(User, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

        return TokenResponse(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
        )

    async def get_current_user(self, session: AsyncSession, user_id: str) -> UserResponse:
        user = await session.get(User, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        return UserResponse(**user.to_dict())


auth_service = AuthService()
