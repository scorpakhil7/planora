from fastapi import APIRouter

from app.core.response import fail, ok
from app.services.pnr_service import check_pnr

router = APIRouter(prefix="/pnr", tags=["PNR"])


@router.get("/{pnr_number}")
async def get_pnr_status(pnr_number: str):
    """
    Check Indian Railways PNR status.
    PNR must be exactly 10 digits.
    No authentication required — PNR is a public lookup by ticket number.
    """
    result = await check_pnr(pnr_number)

    if not result.get("found"):
        return fail(
            result.get("error", "PNR not found or unavailable."),
            data={"pnr": result.get("pnr", pnr_number)},
        )

    return ok(result)
