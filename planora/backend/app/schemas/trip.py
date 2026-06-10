from datetime import date
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.db.enums import TripStatus


class DestinationSchema(BaseModel):
    city: str = Field(..., min_length=1, max_length=255)
    country: str = Field(..., min_length=1, max_length=255)
    order: int = Field(..., ge=1)
    duration_days: int = Field(..., ge=1)


class TripCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    destinations: list[DestinationSchema] = Field(..., min_length=1)
    start_date: date
    end_date: date
    metadata: dict[str, Any] = {}

    # New fields
    from_city: str | None = None
    departure_time: str | None = None
    budget_total: float | None = None
    currency: str | None = "INR"
    travelers_count: int | None = 1

    @model_validator(mode="after")
    def validate_dates_and_destinations(self) -> "TripCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        orders = [d.order for d in self.destinations]
        if len(orders) != len(set(orders)):
            raise ValueError("Destination order values must be unique")
        return self


class TripUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    destinations: list[DestinationSchema] | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: TripStatus | None = None
    metadata: dict[str, Any] | None = None


class TripResponse(BaseModel):
    id: str
    user_id: str
    userId: str | None = None
    title: str
    location: str | None = None
    destinations: list[dict]
    start_date: date
    startDate: date | None = None
    end_date: date
    endDate: date | None = None
    status: str
    metadata: dict[str, Any] = {}
    is_deleted: bool = False
    isDeleted: bool | None = None
