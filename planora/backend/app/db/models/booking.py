from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import BookingStatus, BookingType

if TYPE_CHECKING:
    from app.db.models.trip import Trip
    from app.db.models.payment import Payment


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        comment="BookingType enum: train | bus | flight | hotel"
    )
    status: Mapped[str] = mapped_column(
        String(50), default=BookingStatus.pending.value, nullable=False, index=True,
        comment="BookingStatus enum: pending | confirmed | cancelled | failed"
    )
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    reference: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    trip: Mapped[Trip] = relationship("Trip", back_populates="bookings")
    payments: Mapped[list[Payment]] = relationship(
        "Payment", back_populates="booking", cascade="all, delete-orphan", lazy="selectin"
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "trip_id": str(self.trip_id),
            "user_id": str(self.user_id),
            "type": self.type,
            "status": self.status,
            "provider": self.provider,
            "reference": self.reference,
            "amount": self.amount,
            "currency": self.currency,
            "metadata": self.metadata_,
            "is_deleted": self.is_deleted,
        }
