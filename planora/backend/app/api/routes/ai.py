from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_id
from app.db.session import get_db
from app.services.ai_service import ai_service
from app.core.response import ok, fail

router = APIRouter(prefix="/ai", tags=["AI"])


class PlanRequest(BaseModel):
    goal: str
    context: dict | None = None


class RefineRequest(BaseModel):
    goal: str
    feedback: str


class ItineraryRequest(BaseModel):
    trip_id: str
    location: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    destinations: list[dict] | None = None


@router.post("/plan")
async def create_plan(body: PlanRequest):
    data = await ai_service.generate_plan(body.goal, body.context)
    return ok(data)


@router.post("/plan/refine")
async def refine_plan(body: RefineRequest):
    data = await ai_service.refine_plan(body.goal, body.feedback)
    return ok(data)


@router.get("/prompts")
async def get_prompt_names():
    names = await ai_service.get_prompt_names()
    return ok(names)


@router.get("/prompts/{name}")
async def render_prompt(name: str, goal: str = ""):
    try:
        data = await ai_service.render_prompt(name, goal=goal)
        return ok(data)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=fail(str(exc)))


@router.post("/itinerary")
async def generate_itinerary(
    body: ItineraryRequest,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    from app.services.trip_service import trip_service

    trip = await trip_service.get_detail(session, body.trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Trip not found.")

    destinations = body.destinations or trip.get("destinations") or []
    start_date = body.start_date or body.startDate or trip.get("start_date")
    end_date = body.end_date or body.endDate or trip.get("end_date")

    # Read saved fields from metadata
    meta = trip.get("metadata") or {}
    from_city = meta.get("from_city") or ""
    departure_time = meta.get("departure_time") or "09:00"
    budget_total = meta.get("budget_total") or 0
    currency = meta.get("currency") or "INR"
    travelers_count = meta.get("travelers_count") or 1

    # Pilgrimage fields
    pilgrimage_mode = meta.get("pilgrimage_mode") or False
    darshan_type = meta.get("darshan_type") or "general"
    pilgrimage_accommodation = meta.get("pilgrimage_accommodation") or "budget_hotel"

    first_dest = destinations[0].get("city", "the destination") if destinations else "the destination"
    goal = (
        f"Create a {'pilgrimage' if pilgrimage_mode else 'travel'} itinerary from {from_city} to {first_dest}"
        if from_city else
        f"Create a {'pilgrimage' if pilgrimage_mode else 'travel'} itinerary for {first_dest}"
    )

    print(f"DEBUG ai route: from_city={from_city}, departure_time={departure_time}, budget={budget_total}, persons={travelers_count}, pilgrimage={pilgrimage_mode}")

    itinerary = await ai_service.generate_itinerary(
        session=session,
        trip_id=body.trip_id,
        goal=goal,
        context={
            "destinations": destinations,
            "start_date": start_date,
            "end_date": end_date,
            "from_city": from_city,
            "departure_time": departure_time,
            "budget_total": budget_total,
            "currency": currency,
            "persons": travelers_count,
            # Pilgrimage context
            "pilgrimage_mode": pilgrimage_mode,
            "darshan_type": darshan_type,
            "pilgrimage_accommodation": pilgrimage_accommodation,
        },
    )
    return ok({"itinerary": itinerary, "fallback": False})
