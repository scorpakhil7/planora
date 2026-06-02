from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import BookingStatus, BookingType
from app.db.models.booking import Booking
from app.db.models.trip import Trip
from app.integrations import registry
from app.schemas.booking import BookingCreate, BookingResponse


# ---------------------------------------------------------------------------
# Mapping: BookingType enum value → integration adapter name in the registry
# ---------------------------------------------------------------------------

_ADAPTER_FOR: dict[str, str] = {
    BookingType.train.value:  "irctc",
    BookingType.bus.value:    "redbus",
    BookingType.flight.value: "flights",
    BookingType.hotel.value:  "hotels",
}


def _extract_reference(booking_data: dict[str, Any]) -> str:
    """
    Pull a stable reference ID from the adapter's booking response.
    Each adapter uses a different key; fall back to a UUID if none is found.
    """
    for key in ("pnr", "booking_id", "reservation_id", "confirmation_code"):
        value = booking_data.get(key)
        if value:
            return str(value)
    return str(uuid.uuid4())


class BookingService:
    """Orchestrates booking operations with real DB persistence."""

    # -----------------------------------------------------------------------
    # Existing methods (unchanged)
    # -----------------------------------------------------------------------

    async def create(
        self,
        session: AsyncSession,
        trip_id: str,
        user_id: str,
        payload: BookingCreate,
    ) -> BookingResponse:
        booking = Booking(
            id=uuid.uuid4(),
            trip_id=uuid.UUID(trip_id),
            user_id=uuid.UUID(user_id),
            type=payload.type,
            status="pending",
            provider=payload.provider,
            reference="",
            amount=payload.amount,
            currency=payload.currency,
            metadata_=payload.metadata,
        )
        session.add(booking)
        await session.flush()
        await session.refresh(booking)
        return BookingResponse(**booking.to_dict())

    async def get(self, session: AsyncSession, booking_id: str) -> BookingResponse | None:
        booking = await session.get(Booking, uuid.UUID(booking_id))
        return BookingResponse(**booking.to_dict()) if booking else None

    async def list_for_trip(self, session: AsyncSession, trip_id: str) -> list[BookingResponse]:
        result = await session.scalars(
            select(Booking)
            .where(Booking.trip_id == uuid.UUID(trip_id))
            .order_by(Booking.created_at.desc())
        )
        return [BookingResponse(**b.to_dict()) for b in result.all()]

    async def cancel(self, session: AsyncSession, booking_id: str, user_id: str) -> BookingResponse:
        booking = await session.get(Booking, uuid.UUID(booking_id))
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        if str(booking.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        booking.status = "cancelled"
        await session.flush()
        await session.refresh(booking)
        return BookingResponse(**booking.to_dict())

    # -----------------------------------------------------------------------
    # Booking orchestration — new methods
    # -----------------------------------------------------------------------

    async def create_booking(
        self,
        session: AsyncSession,
        trip_id: str,
        user_id: str,
        booking_type: BookingType,
        details: dict[str, Any],
    ) -> BookingResponse:
        """
        Full booking orchestration flow:
          1. Validate trip exists and belongs to user.
          2. Resolve the correct integration adapter from the registry.
          3. Call adapter.book(details) to get a mock confirmed response.
          4. Persist a Booking record with status=CONFIRMED.
          5. Return the structured BookingResponse.
        """
        # 1. Validate trip ownership
        trip = await session.get(Trip, uuid.UUID(trip_id))
        if not trip or trip.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found.",
            )
        if str(trip.user_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this trip.",
            )

        # 2. Resolve adapter
        adapter_name = _ADAPTER_FOR.get(booking_type.value)
        if not adapter_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported booking type: '{booking_type.value}'.",
            )
        try:
            adapter = registry.get(adapter_name)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Integration adapter '{adapter_name}' is not available.",
            )

        # 3. Call adapter — dispatches to adapter.book(details) internally
        adapter_response = await adapter.call("book", details)
        booking_data: dict[str, Any] = adapter_response.get("booking", {})

        # 4. Extract fields from adapter response
        reference = _extract_reference(booking_data)
        amount = float(booking_data.get("amount_paid", details.get("fare", 0.0)))
        currency: str = booking_data.get("currency", "INR")

        # 5. Persist Booking record
        booking = Booking(
            id=uuid.uuid4(),
            trip_id=uuid.UUID(trip_id),
            user_id=uuid.UUID(user_id),
            type=booking_type.value,
            status=BookingStatus.confirmed.value,
            provider=adapter.name,
            reference=reference,
            amount=amount,
            currency=currency,
            # Store full adapter response for audit / downstream use
            metadata_=adapter_response,
        )
        session.add(booking)
        await session.flush()
        await session.refresh(booking)
        return BookingResponse(**booking.to_dict())

    async def list_trip_bookings(
        self,
        session: AsyncSession,
        trip_id: str,
    ) -> list[BookingResponse]:
        """
        Return all active (non-soft-deleted) bookings for a trip,
        ordered newest first.
        """
        result = await session.scalars(
            select(Booking)
            .where(
                Booking.trip_id == uuid.UUID(trip_id),
                Booking.is_deleted.is_(False),
            )
            .order_by(Booking.created_at.desc())
        )
        return [BookingResponse(**b.to_dict()) for b in result.all()]


booking_service = BookingService()
