from fastapi import APIRouter
from app.core.response import ok

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check():
    return ok({"status": "ok", "service": "planora-api"})
