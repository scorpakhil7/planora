from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.trip import Trip
    from app.db.models.document import Document
    from app.db.models.payment import Payment


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Soft delete — `is_active=False` flags deactivation; `deleted_at` timestamps it
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    trips: Mapped[list[Trip]] = relationship(
        "Trip", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    documents: Mapped[list[Document]] = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[list[Payment]] = relationship(
        "Payment", back_populates="user", lazy="selectin"
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "preferences": self.preferences,
        }
