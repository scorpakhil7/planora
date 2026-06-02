from typing import Any
from app.integrations.base import BaseAdapter


class IRCTCAdapter(BaseAdapter):
    """Mock adapter for IRCTC (Indian Railways) train bookings."""

    @property
    def name(self) -> str:
        return "irctc"

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
                    "train_number": "12301",
                    "name": "Rajdhani Express",
                    "from": payload.get("from", "NDLS"),
                    "to": payload.get("to", "HWH"),
                    "departure": "16:55",
                    "arrival": "10:00+1",
                    "duration": "17h 5m",
                    "classes": ["1A", "2A", "3A", "SL"],
                    "available_seats": {"1A": 4, "2A": 12, "3A": 28, "SL": 120},
                    "fare": {"1A": 4560, "2A": 2680, "3A": 1890, "SL": 720},
                },
                {
                    "train_number": "12305",
                    "name": "Howrah Rajdhani",
                    "from": payload.get("from", "NDLS"),
                    "to": payload.get("to", "HWH"),
                    "departure": "19:55",
                    "arrival": "09:55+1",
                    "duration": "14h 0m",
                    "classes": ["1A", "2A", "3A"],
                    "available_seats": {"1A": 2, "2A": 6, "3A": 15},
                    "fare": {"1A": 4890, "2A": 2980, "3A": 2100},
                },
            ],
        }

    async def book(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "book",
            "booking": {
                "pnr": "4512367890",
                "train_number": payload.get("train_number", "12301"),
                "class": payload.get("class", "3A"),
                "passenger_count": payload.get("passenger_count", 1),
                "status": "confirmed",
                "amount_paid": payload.get("fare", 1890),
                "currency": "INR",
            },
        }

    async def cancel(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "cancel",
            "pnr": payload.get("pnr", ""),
            "status": "cancelled",
            "refund_amount": payload.get("refund_amount", 0),
            "refund_eta_days": 5,
        }
