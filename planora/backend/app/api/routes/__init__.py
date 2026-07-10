from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.trips import router as trips_router
from app.api.routes.bookings import router as bookings_router
from app.api.routes.ai import router as ai_router
from app.api.routes.integrations import router as integrations_router
from app.api.routes.pnr import router as pnr_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(trips_router)
api_router.include_router(bookings_router)
api_router.include_router(ai_router)
api_router.include_router(integrations_router)
api_router.include_router(pnr_router)
