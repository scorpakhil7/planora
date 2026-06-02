from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.enums import BookingStatus, TripStatus
from app.db.models.booking import Booking
from app.db.models.itinerary import Itinerary
from app.db.models.trip import Trip
from app.schemas.trip import TripCreate, TripResponse, TripUpdate


class TripService:
    """Manages trip planning lifecycle with real DB persistence."""

    # -----------------------------------------------------------------------
    # Existing CRUD methods (signatures unchanged)
    # -----------------------------------------------------------------------

    async def create(self, session: AsyncSession, user_id: str, payload: TripCreate) -> TripResponse:
        trip = Trip(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            title=payload.title,
            destinations=[d.model_dump() for d in payload.destinations],
            start_date=payload.start_date,
            end_date=payload.end_date,
            status=TripStatus.draft.value,
            metadata_=payload.metadata,
        )
        session.add(trip)
        await session.flush()
        await session.refresh(trip)
        return TripResponse(**trip.to_dict())

    async def get(self, session: AsyncSession, trip_id: str) -> TripResponse | None:
        trip = await session.get(Trip, uuid.UUID(trip_id))
        if not trip or trip.is_deleted:
            return None
        return TripResponse(**trip.to_dict())

    async def list_for_user(self, session: AsyncSession, user_id: str) -> list[TripResponse]:
        result = await session.scalars(
            select(Trip)
            .where(Trip.user_id == uuid.UUID(user_id), Trip.is_deleted.is_(False))
            .order_by(Trip.created_at.desc())
        )
        return [TripResponse(**t.to_dict()) for t in result.all()]

    async def update(
        self, session: AsyncSession, trip_id: str, user_id: str, payload: TripUpdate
    ) -> TripResponse:
        trip = await session.get(Trip, uuid.UUID(trip_id))
        if not trip or trip.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        if str(trip.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        updates = payload.model_dump(exclude_none=True)
        for field, value in updates.items():
            if field == "metadata":
                trip.metadata_ = value
            elif field == "location":
                destinations = list(trip.destinations or [])
                if destinations:
                    destinations[0] = {**destinations[0], "city": value}
                else:
                    destinations = [
                        {"city": value, "country": "Unknown", "order": 1, "duration_days": 1}
                    ]
                trip.destinations = destinations
            elif field == "destinations":
                trip.destinations = [
                    d.model_dump() if hasattr(d, "model_dump") else d for d in value
                ]
            elif field == "status":
                trip.status = value.value if hasattr(value, "value") else value
            else:
                setattr(trip, field, value)

        await session.flush()
        await session.refresh(trip)
        return TripResponse(**trip.to_dict())

    async def delete(self, session: AsyncSession, trip_id: str, user_id: str) -> bool:
        """Soft delete — sets is_deleted=True and records deleted_at timestamp."""
        trip = await session.get(Trip, uuid.UUID(trip_id))
        if not trip or trip.is_deleted:
            return False
        if str(trip.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        trip.is_deleted = True
        trip.deleted_at = datetime.now(timezone.utc)
        await session.flush()
        return True

    # -----------------------------------------------------------------------
    # Itinerary persistence
    # -----------------------------------------------------------------------

    async def save_itinerary(
        self,
        session: AsyncSession,
        trip_id: str,
        days: list[dict[str, Any]],
        generated_by_ai: bool = True,
        notes: str = "",
    ) -> dict[str, Any]:
        """
        Create or overwrite the Itinerary record for a trip.

        - If an itinerary already exists for the trip it is overwritten in place
          (simple overwrite strategy; version tracking can be added later).
        - After saving, trip status is synchronised via _sync_status().

        Returns the saved itinerary as a plain dict.
        """
        trip = await session.get(Trip, uuid.UUID(trip_id))
        if not trip or trip.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found.",
            )

        # Query the existing itinerary directly — avoids async lazy-load issues
        existing: Itinerary | None = await session.scalar(
            select(Itinerary).where(Itinerary.trip_id == uuid.UUID(trip_id))
        )

        if existing:
            # Overwrite
            existing.days = days
            existing.generated_by_ai = generated_by_ai
            if notes:
                existing.notes = notes
            itinerary = existing
        else:
            # Create
            itinerary = Itinerary(
                id=uuid.uuid4(),
                trip_id=uuid.UUID(trip_id),
                days=days,
                notes=notes,
                generated_by_ai=generated_by_ai,
            )
            session.add(itinerary)

        # Synchronise trip status after itinerary change
        await self._sync_status(session, trip)

        await session.flush()
        await session.refresh(itinerary)
        return itinerary.to_dict()

    # -----------------------------------------------------------------------
    # Trip detail — includes itinerary when present
    # -----------------------------------------------------------------------

    async def get_detail(
        self,
        session: AsyncSession,
        trip_id: str,
    ) -> dict[str, Any] | None:
        """
        Fetch a trip with its associated itinerary eagerly loaded.
        Returns a plain dict so the itinerary can be nested without
        modifying the TripResponse schema.

        Shape:
          { ...trip fields..., "itinerary": { ...itinerary fields... } | None }
        """
        result = await session.execute(
            select(Trip)
            .options(selectinload(Trip.itinerary))
            .where(Trip.id == uuid.UUID(trip_id), Trip.is_deleted.is_(False))
        )
        trip: Trip | None = result.scalar_one_or_none()
        if not trip:
            return None

        data: dict[str, Any] = trip.to_dict()
        data["itinerary"] = trip.itinerary.to_dict() if trip.itinerary else None
        return data

    # -----------------------------------------------------------------------
    # Status synchronisation (internal)
    # -----------------------------------------------------------------------

    async def _sync_status(self, session: AsyncSession, trip: Trip) -> None:
        """
        Derive and apply the correct trip status from current itinerary
        and booking state.

        Rules (applied in priority order — last match wins):
          1. Itinerary exists → active
          2. All non-deleted bookings are cancelled → cancelled
             (only applies when at least one booking exists)
        """
        trip_uuid = trip.id

        # Check itinerary existence
        itinerary_count: int = await session.scalar(
            select(func.count(Itinerary.id)).where(Itinerary.trip_id == trip_uuid)
        ) or 0

        # Check active bookings (non-deleted, non-cancelled)
        active_bookings: int = await session.scalar(
            select(func.count(Booking.id)).where(
                Booking.trip_id == trip_uuid,
                Booking.is_deleted.is_(False),
                Booking.status != BookingStatus.cancelled.value,
            )
        ) or 0

        # Check total non-deleted bookings
        total_bookings: int = await session.scalar(
            select(func.count(Booking.id)).where(
                Booking.trip_id == trip_uuid,
                Booking.is_deleted.is_(False),
            )
        ) or 0

        new_status = trip.status

        if itinerary_count > 0:
            new_status = TripStatus.active.value

        if total_bookings > 0 and active_bookings == 0:
            new_status = TripStatus.cancelled.value

        trip.status = new_status


trip_service = TripService()
