from typing import Any
from app.integrations.base import BaseAdapter


class HotelsAdapter(BaseAdapter):
    """Mock adapter for hotel search and booking."""

    @property
    def name(self) -> str:
        return "hotels"

    async def initialize(self) -> None:
        pass

    async def health_check(self) -> bool:
        return True

    async def call(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        dispatch = {"search": self.search, "book": self.book, "cancel": self.cancel}
        if action not in dispatch:
            raise ValueError(f"Unknown action '{action}' for adapter '{self.name}'")
        return await dispatch[action](payload)

    async def search(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "search",
            "results": [
                {
                    "hotel_id": "HTL-BOM-001",
                    "name": "The Taj Mahal Palace",
                    "city": payload.get("city", "Mumbai"),
                    "stars": 5,
                    "rating": 4.8,
                    "room_type": "Deluxe Sea View",
                    "check_in": payload.get("check_in", "2025-01-15"),
                    "check_out": payload.get("check_out", "2025-01-17"),
                    "nights": 2,
                    "price_per_night": 18500,
                    "total": 37000,
                    "currency": "INR",
                    "amenities": ["Pool", "Spa", "Restaurant", "WiFi", "Gym"],
                    "cancellation_policy": "Free cancellation till 24h before check-in",
                },
                {
                    "hotel_id": "HTL-BOM-002",
                    "name": "ITC Maratha",
                    "city": payload.get("city", "Mumbai"),
                    "stars": 5,
                    "rating": 4.6,
                    "room_type": "Superior Room",
                    "check_in": payload.get("check_in", "2025-01-15"),
                    "check_out": payload.get("check_out", "2025-01-17"),
                    "nights": 2,
                    "price_per_night": 12000,
                    "total": 24000,
                    "currency": "INR",
                    "amenities": ["Pool", "Restaurant", "WiFi", "Business Center"],
                    "cancellation_policy": "Free cancellation till 48h before check-in",
                },
                {
                    "hotel_id": "HTL-BOM-003",
                    "name": "Ibis Mumbai Airport",
                    "city": payload.get("city", "Mumbai"),
                    "stars": 3,
                    "rating": 4.1,
                    "room_type": "Standard Room",
                    "check_in": payload.get("check_in", "2025-01-15"),
                    "check_out": payload.get("check_out", "2025-01-17"),
                    "nights": 2,
                    "price_per_night": 3200,
                    "total": 6400,
                    "currency": "INR",
                    "amenities": ["WiFi", "Restaurant"],
                    "cancellation_policy": "Non-refundable",
                },
            ],
        }

    async def book(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "book",
            "booking": {
                "reservation_id": "RES-HT-5523901",
                "hotel_id": payload.get("hotel_id", "HTL-BOM-001"),
                "room_type": payload.get("room_type", "Deluxe Sea View"),
                "guest_count": payload.get("guest_count", 1),
                "check_in": payload.get("check_in", ""),
                "check_out": payload.get("check_out", ""),
                "status": "confirmed",
                "amount_paid": payload.get("total", 37000),
                "currency": "INR",
            },
        }

    async def cancel(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "cancel",
            "reservation_id": payload.get("reservation_id", ""),
            "status": "cancelled",
            "refund_amount": payload.get("refund_amount", 0),
            "refund_eta_days": 5,
        }
