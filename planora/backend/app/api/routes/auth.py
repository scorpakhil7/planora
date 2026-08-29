from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import ok
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.auth import (
    UserCreate,
    LoginRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup")
async def signup(payload: UserCreate, session: AsyncSession = Depends(get_db)):
    """Sign up — sends OTP to email, user must verify before login."""
    result = await auth_service.signup(session, payload)
    return ok(
        {
            "message": "Check your email for a 6-digit verification code.",
            "email": result["email"],
            "is_verified": False,
            "email_sent": result["email_sent"],
            **({"dev_otp": result["dev_otp"]} if "dev_otp" in result else {}),
        }
    )


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOTPRequest, session: AsyncSession = Depends(get_db)):
    """Verify OTP and mark email as verified."""
    user = await auth_service.verify_otp(session, payload.email, payload.otp)
    tokens = await auth_service.create_tokens(str(user.id))
    return ok(tokens.model_dump())


@router.post("/resend-otp")
async def resend_otp(payload: ResendOTPRequest, session: AsyncSession = Depends(get_db)):
    """Resend OTP to email."""
    result = await auth_service.resend_otp(session, payload.email)
    return ok(
        {
            "message": "OTP resent to your email.",
            "email_sent": result["email_sent"],
            **({"dev_otp": result["dev_otp"]} if "dev_otp" in result else {}),
        }
    )


@router.post("/login")
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)):
    """Log in — requires verified email."""
    tokens = await auth_service.login(session, payload)
    return ok(tokens.model_dump())


@router.get("/me")
async def me(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    user = await auth_service.get_current_user(session, user_id)
    return ok(user.model_dump())
