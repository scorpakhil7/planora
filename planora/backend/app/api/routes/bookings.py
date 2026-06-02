from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import fail, ok
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.booking import BookingCreate
from app.services.booking_service import booking_service

router = APIRouter(prefix="/trips/{trip_id}/bookings", tags=["Bookings"])


@router.post("")
async def create_booking(
    trip_id: str,
    payload: BookingCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    booking = await booking_service.create(session, trip_id, user_id, payload)
    return ok(booking.model_dump())


@router.get("")
async def list_bookings(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    bookings = await booking_service.list_for_trip(session, trip_id)
    return ok([b.model_dump() for b in bookings])


@router.get("/{booking_id}")
async def get_booking(
    trip_id: str,
    booking_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    booking = await booking_service.get(session, booking_id)
    if not booking:
        return fail("Booking not found.")
    return ok(booking.model_dump())


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    trip_id: str,
    booking_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    booking = await booking_service.cancel(session, booking_id, user_id)
    return ok(booking.model_dump())
