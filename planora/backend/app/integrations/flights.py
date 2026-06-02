from typing import Any
from app.integrations.base import BaseAdapter


class FlightsAdapter(BaseAdapter):
    """Mock adapter for domestic and international flight bookings."""

    @property
    def name(self) -> str:
        return "flights"

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
                    "flight_number": "6E 204",
                    "airline": "IndiGo",
                    "from": payload.get("from", "DEL"),
                    "to": payload.get("to", "BOM"),
                    "departure": "06:00",
                    "arrival": "08:10",
                    "duration": "2h 10m",
                    "stops": 0,
                    "cabin": "Economy",
                    "available_seats": 22,
                    "fare": 4899,
                    "currency": "INR",
                    "baggage": "15 kg check-in + 7 kg cabin",
                },
                {
                    "flight_number": "AI 101",
                    "airline": "Air India",
                    "from": payload.get("from", "DEL"),
                    "to": payload.get("to", "BOM"),
                    "departure": "09:30",
                    "arrival": "11:50",
                    "duration": "2h 20m",
                    "stops": 0,
                    "cabin": "Economy",
                    "available_seats": 8,
                    "fare": 5699,
                    "currency": "INR",
                    "baggage": "25 kg check-in + 8 kg cabin",
                },
                {
                    "flight_number": "UK 955",
                    "airline": "Vistara",
                    "from": payload.get("from", "DEL"),
                    "to": payload.get("to", "BOM"),
                    "departure": "14:15",
                    "arrival": "16:30",
                    "duration": "2h 15m",
                    "stops": 0,
                    "cabin": "Business",
                    "available_seats": 4,
                    "fare": 14500,
                    "currency": "INR",
                    "baggage": "30 kg check-in + 10 kg cabin",
                },
            ],
        }

    async def book(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "book",
            "booking": {
                "pnr": "XKQR7A",
                "flight_number": payload.get("flight_number", "6E 204"),
                "passenger_count": payload.get("passenger_count", 1),
                "cabin": payload.get("cabin", "Economy"),
                "status": "confirmed",
                "amount_paid": payload.get("fare", 4899),
                "currency": "INR",
                "e_ticket": f"EKT-{payload.get('flight_number', '6E204').replace(' ', '')}-001",
            },
        }

    async def cancel(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "action": "cancel",
            "pnr": payload.get("pnr", ""),
            "status": "cancelled",
            "refund_amount": payload.get("refund_amount", 0),
            "cancellation_fee": payload.get("cancellation_fee", 500),
            "refund_eta_days": 7,
        }
