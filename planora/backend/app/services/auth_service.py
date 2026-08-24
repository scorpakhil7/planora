import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password, verify_password, create_access_token
from app.db.models.user import User
from app.schemas.auth import UserCreate, LoginRequest, TokenResponse
from app.core.email import generate_otp, send_otp_email


class AuthService:
    """Handles user authentication and email verification."""

    async def signup(self, session: AsyncSession, payload: UserCreate) -> dict:
        """Create user, generate OTP, send email. Returns user info."""
        # Check if email exists
        existing = await session.execute(select(User).where(User.email == payload.email))
        if existing.scalar():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered.",
            )

        # Create user (unverified)
        user = User(
            id=uuid.uuid4(),
            email=payload.email,
            name=payload.name,
            password_hash=hash_password(payload.password),
            is_verified=False,
        )
        session.add(user)
        await session.flush()

        # Generate OTP and store in preferences
        otp = generate_otp()
        otp_expires = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        user.preferences = {"otp": otp, "otp_expires": otp_expires}
        await session.flush()

        # Send email
        send_otp_email(user.email, otp, user.name)

        # Commit
        await session.commit()

        return {"email": user.email, "id": str(user.id)}

    async def verify_otp(
        self, session: AsyncSession, email: str, otp: str
    ) -> User:
        """Verify OTP and mark user as verified."""
        user = await session.execute(select(User).where(User.email == email))
        user = user.scalar()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified.",
            )

        stored_otp = user.preferences.get("otp")
        otp_expires_str = user.preferences.get("otp_expires")

        if not stored_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Request a new one.",
            )

        if otp_expires_str and datetime.fromisoformat(otp_expires_str) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired.",
            )

        if stored_otp != otp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OTP.",
            )

        # Mark as verified and clear OTP
        user.is_verified = True
        user.preferences = {}
        await session.commit()

        return user

    async def resend_otp(self, session: AsyncSession, email: str) -> None:
        """Resend OTP to email."""
        user = await session.execute(select(User).where(User.email == email))
        user = user.scalar()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified.",
            )

        # Generate new OTP
        otp = generate_otp()
        otp_expires = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        user.preferences = {"otp": otp, "otp_expires": otp_expires}
        await session.flush()

        # Send email
        send_otp_email(user.email, otp, user.name)

        await session.commit()

    async def login(self, session: AsyncSession, payload: LoginRequest) -> TokenResponse:
        """Log in — check email verified, password valid."""
        user = await session.execute(select(User).where(User.email == payload.email))
        user = user.scalar()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Check your inbox for OTP.",
            )

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        return await self.create_tokens(str(user.id))

    async def create_tokens(self, user_id: str) -> TokenResponse:
        """Create access token."""
        access_token = create_access_token(user_id)
        return TokenResponse(access_token=access_token)

    async def get_current_user(self, session: AsyncSession, user_id: str):
        """Get current user."""
        from app.schemas.auth import UserResponse

        user = await session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )
        return UserResponse(**user.to_dict())


auth_service = AuthService()
