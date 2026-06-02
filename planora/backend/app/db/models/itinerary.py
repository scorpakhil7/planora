from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.trip import Trip


# ---------------------------------------------------------------------------
# Structured schema for each item in the `days` JSON list (documentation only)
# ---------------------------------------------------------------------------
#
# ItineraryDay = {
#   "day_number": int,               # 1-indexed
#   "date": "YYYY-MM-DD",
#   "title": str,
#   "destination": str,
#   "activities": [
#     {
#       "time": "HH:MM",            # 24h
#       "title": str,
#       "location": str,
#       "category": str,            # sightseeing | food | transport | leisure | other
#       "duration_minutes": int,
#       "cost_estimate": float,
#       "notes": str
#     }
#   ],
#   "accommodation": {
#     "name": str,
#     "address": str,
#     "check_in": "HH:MM",
#     "check_out": "HH:MM"
#   } | None,
#   "transportation": {
#     "mode": str,                   # flight | train | bus | cab | walk | other
#     "from": str,
#     "to": str,
#     "departure": "HH:MM",
#     "arrival": "HH:MM",
#     "booking_reference": str
#   } | None,
#   "budget_estimate": float,
#   "currency": str                  # default "INR"
# }


class Itinerary(Base):
    __tablename__ = "itineraries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # List of ItineraryDay objects (schema documented above)
    days: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    generated_by_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    trip: Mapped[Trip] = relationship("Trip", back_populates="itinerary")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "trip_id": str(self.trip_id),
            "days": self.days,
            "notes": self.notes,
            "generated_by_ai": self.generated_by_ai,
        }
