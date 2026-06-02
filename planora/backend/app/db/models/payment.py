from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import PaymentMethod, UpiApp

if TYPE_CHECKING:
    from app.db.models.booking import Booking
    from app.db.models.user import User


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)
    gateway: Mapped[str] = mapped_column(String(100), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    # Payment method details
    payment_method: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="PaymentMethod enum: upi | card | wallet | netbanking | cash"
    )
    upi_app: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="UpiApp enum (only when payment_method=upi): gpay | phonepe | paytm | bhim | other"
    )

    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    booking: Mapped[Booking] = relationship("Booking", back_populates="payments")
    user: Mapped[User | None] = relationship("User", back_populates="payments")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "booking_id": str(self.booking_id),
            "user_id": str(self.user_id) if self.user_id else None,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "gateway": self.gateway,
            "transaction_id": self.transaction_id,
            "payment_method": self.payment_method,
            "upi_app": self.upi_app,
            "metadata": self.metadata_,
            "is_deleted": self.is_deleted,
        }
