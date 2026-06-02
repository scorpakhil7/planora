from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import TripStatus

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.booking import Booking
    from app.db.models.itinerary import Itinerary
    from app.db.models.document import Document


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Replaces origin + destination — supports multi-leg/multi-city trips.
    # Each item: {"city": str, "country": str, "order": int, "duration_days": int}
    destinations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=TripStatus.draft.value, nullable=False, index=True
    )
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="trips")
    bookings: Mapped[list[Booking]] = relationship(
        "Booking", back_populates="trip", cascade="all, delete-orphan", lazy="selectin"
    )
    itinerary: Mapped[Itinerary | None] = relationship(
        "Itinerary", back_populates="trip", uselist=False, cascade="all, delete-orphan"
    )
    documents: Mapped[list[Document]] = relationship(
        "Document", back_populates="trip", lazy="selectin"
    )

    def to_dict(self) -> dict:
        start_date = self.start_date.isoformat()
        end_date = self.end_date.isoformat()
        first_destination = self.destinations[0] if self.destinations else {}
        location = first_destination.get("city", "") if isinstance(first_destination, dict) else ""

        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "userId": str(self.user_id),
            "title": self.title,
            "location": location,
            "destinations": self.destinations,
            "start_date": start_date,
            "startDate": start_date,
            "end_date": end_date,
            "endDate": end_date,
            "status": self.status,
            "metadata": self.metadata_,
            "is_deleted": self.is_deleted,
            "isDeleted": self.is_deleted,
        }
