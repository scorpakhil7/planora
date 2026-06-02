from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.schemas.user import UserResponse


class UserService:
    """Manages user lifecycle: lookup and preference updates."""

    async def get_by_id(self, session: AsyncSession, user_id: str) -> UserResponse | None:
        user = await session.get(User, uuid.UUID(user_id))
        return UserResponse(**user.to_dict()) if user else None

    async def get_by_email(self, session: AsyncSession, email: str) -> UserResponse | None:
        user = await session.scalar(select(User).where(User.email == email))
        return UserResponse(**user.to_dict()) if user else None

    async def update_preferences(
        self, session: AsyncSession, user_id: str, preferences: dict[str, Any]
    ) -> UserResponse:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        user.preferences = {**user.preferences, **preferences}
        await session.flush()
        await session.refresh(user)
        return UserResponse(**user.to_dict())

    async def delete(self, session: AsyncSession, user_id: str) -> bool:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            return False
        user.is_active = False
        await session.flush()
        return True


user_service = UserService()
