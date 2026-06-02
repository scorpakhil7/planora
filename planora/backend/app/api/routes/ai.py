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
    """Route → AIService → PlannerService: decompose goal into ordered steps."""
    data = await ai_service.generate_plan(body.goal, body.context)
    return ok(data)


@router.post("/plan/refine")
async def refine_plan(body: RefineRequest):
    """Route → AIService → PlannerService: refine an existing plan."""
    data = await ai_service.refine_plan(body.goal, body.feedback)
    return ok(data)


@router.get("/prompts")
async def get_prompt_names():
    """List all registered prompt template names."""
    names = await ai_service.get_prompt_names()
    return ok(names)


@router.get("/prompts/{name}")
async def render_prompt(name: str, goal: str = ""):
    """Render a registered prompt template by name."""
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
    location = body.location or trip.get("location") or "Trip"
    start_date = body.start_date or body.startDate or trip.get("start_date")

    itinerary = await ai_service.generate_itinerary(
        session=session,
        trip_id=body.trip_id,
        goal=f"Create a travel itinerary for {location}",
        context={
            "destinations": destinations,
            "start_date": start_date,
        },
    )
    return ok({"itinerary": itinerary, "fallback": False})
