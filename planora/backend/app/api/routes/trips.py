from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import fail, ok
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.trip import TripCreate, TripUpdate
from app.services.trip_service import trip_service

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("")
async def create_trip(
    payload: TripCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    trip = await trip_service.create(session, user_id, payload)
    return ok(trip.model_dump())


@router.get("")
async def list_trips(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    trips = await trip_service.list_for_user(session, user_id)
    return ok([t.model_dump() for t in trips])


@router.get("/{trip_id}")
async def get_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    trip = await trip_service.get_detail(session, trip_id)
    if not trip:
        return fail("Trip not found.")
    if trip["user_id"] != user_id:
        return fail("Trip not found.")
    return ok(trip)


@router.patch("/{trip_id}")
@router.put("/{trip_id}")
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    trip = await trip_service.update(session, trip_id, user_id, payload)
    return ok(trip.model_dump())


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    deleted = await trip_service.delete(session, trip_id, user_id)
    return ok({"deleted": deleted})
