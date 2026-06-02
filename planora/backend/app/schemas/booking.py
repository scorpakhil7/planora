from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.db.enums import BookingStatus, BookingType, PaymentMethod, UpiApp


class BookingCreate(BaseModel):
    type: BookingType
    provider: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    metadata: dict[str, Any] = {}


class BookingResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    type: str
    status: str
    provider: str
    reference: str
    amount: float
    currency: str
    metadata: dict[str, Any] = {}
    is_deleted: bool = False


# ---------------------------------------------------------------------------
# Payment schemas (co-located since payments nest under bookings)
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    gateway: str = Field(..., min_length=1)
    payment_method: PaymentMethod
    upi_app: UpiApp | None = None
    metadata: dict[str, Any] = {}

    @model_validator(mode="after")
    def upi_app_requires_upi(self) -> "PaymentCreate":
        if self.upi_app and self.payment_method != PaymentMethod.upi:
            raise ValueError("upi_app is only valid when payment_method is 'upi'")
        return self


class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    user_id: str | None
    amount: float
    currency: str
    status: str
    gateway: str
    transaction_id: str
    payment_method: str | None
    upi_app: str | None
    metadata: dict[str, Any] = {}
    is_deleted: bool = False
