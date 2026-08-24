from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.db.models.user import User
from app.schemas.user import PasswordChangeRequest, ProfileUpdate, UserResponse


class UserService:
    """Manages user lifecycle: lookup, profile, password, and preference updates."""

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

    async def update_profile(
        self, session: AsyncSession, user_id: str, payload: ProfileUpdate
    ) -> UserResponse:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if payload.name is not None:
            user.name = payload.name
        if payload.phone is not None:
            user.preferences = {**user.preferences, "phone": payload.phone}
        await session.flush()
        await session.refresh(user)
        return UserResponse(**user.to_dict())

    async def change_password(
        self, session: AsyncSession, user_id: str, payload: PasswordChangeRequest
    ) -> None:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        user.password_hash = hash_password(payload.new_password)
        await session.flush()

    async def update_travelers(
        self, session: AsyncSession, user_id: str, travelers: list[dict[str, Any]]
    ) -> UserResponse:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        user.preferences = {**user.preferences, "travelers": travelers}
        await session.flush()
        await session.refresh(user)
        return UserResponse(**user.to_dict())

    async def update_travel_preferences(
        self, session: AsyncSession, user_id: str, travel_preferences: dict[str, Any]
    ) -> UserResponse:
        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        existing = user.preferences.get("travel_preferences", {})
        user.preferences = {
            **user.preferences,
            "travel_preferences": {**existing, **travel_preferences},
        }
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
