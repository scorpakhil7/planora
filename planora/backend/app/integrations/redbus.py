from typing import Any
from app.integrations.base import BaseAdapter


class RedBusAdapter(BaseAdapter):
    """Mock adapter for RedBus intercity bus bookings."""

    @property
    def name(self) -> str:
        return "redbus"

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
                    "bus_id": "RB-8821",
                    "operator": "VRL Travels",
                    "type": "Volvo A/C Sleeper (2+1)",
                    "from": payload.get("from", "Bengaluru"),
                    "to": payload.get("to", "Hyderabad"),
                    "departure": "21:00",
                    "arrival": "06:30+1",
                    "duration": "9h 30m",
                    "available_seats": 14,
                    "fare": 950,
                    "currency": "INR",
                    "rating": 4.3,
                },
                {
                    "bus_id": "RB-3347",
                    "operator": "KSRTC",
                    "type": "Non-A/C Seater (2+2)",
                    "from": payload.get("from", "Bengaluru"),
                    "to": payload.get("to", "Hyderabad"),
                    "departure": "22:30",
                    "arrival": "08:00+1",
                    "duration": "9h 30m",
                    "available_seats": 32,
                    "fare": 540,
                    "currency": "INR",
                    "rating": 3.8,
                },
            ],
        }

    async def book(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "book",
            "booking": {
                "ticket_id": "RBT-99102345",
                "bus_id": payload.get("bus_id", "RB-8821"),
                "seat_numbers": payload.get("seats", ["L1"]),
                "passenger_count": len(payload.get("seats", ["L1"])),
                "status": "confirmed",
                "amount_paid": payload.get("fare", 950),
                "currency": "INR",
            },
        }

    async def cancel(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "cancel",
            "ticket_id": payload.get("ticket_id", ""),
            "status": "cancelled",
            "refund_amount": payload.get("refund_amount", 0),
            "refund_eta_days": 7,
        }
