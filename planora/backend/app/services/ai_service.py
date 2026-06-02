from __future__ import annotations

import json
import os
import re
from datetime import date, timedelta
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession


GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


async def _call_groq(prompt: str) -> str:
    """Call Groq API and return the text response."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You are an expert Indian travel planner. Always respond with valid JSON only, no markdown, no explanation."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 4096,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _extract_json(text: str) -> Any:
    """Extract JSON from response (strips markdown fences if present)."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


def _build_prompt(goal: str, context: dict[str, Any]) -> str:
    destinations = context.get("destinations", [])
    start_date = context.get("start_date", date.today().isoformat())
    currency = context.get("currency", "INR")
    persons = context.get("persons", 1)

    dest_lines = "\n".join(
        f"- {d.get('city')}, {d.get('country', 'India')} for {d.get('duration_days', 2)} days"
        for d in sorted(destinations, key=lambda d: d.get("order", 1))
    )
    total_days = sum(int(d.get("duration_days", 2)) for d in destinations)

    return f"""Generate a detailed day-by-day travel itinerary for an Indian trip.

Trip details:
- Goal: {goal}
- Destinations:
{dest_lines}
- Start date: {start_date}
- Total days: {total_days}
- Travelers: {persons}
- Currency: {currency}

Rules:
1. Use REAL attraction names specific to each city
2. For pilgrimage sites include temple timings and darshan details
3. Each day must have DIFFERENT activities
4. All costs in {currency} with realistic Indian prices
5. Include local food specialties

Return ONLY a valid JSON array like this:
[
  {{
    "day_number": 1,
    "date": "YYYY-MM-DD",
    "title": "Day title",
    "destination": "City name",
    "activities": [
      {{
        "time": "HH:MM",
        "title": "Activity name",
        "location": "Specific place",
        "category": "food",
        "duration_minutes": 60,
        "cost_estimate": 500,
        "notes": "Helpful tip"
      }}
    ],
    "accommodation": {{
      "name": "Hotel name",
      "address": "Area, City",
      "check_in": "14:00",
      "check_out": "11:00"
    }},
    "budget_estimate": 2500,
    "currency": "{currency}"
  }}
]"""


class AIService:

    async def generate_plan(self, goal: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        return {"goal": goal, "steps": []}

    async def refine_plan(self, goal: str, feedback: str) -> dict[str, Any]:
        return {"goal": goal, "steps": []}

    async def get_prompt_names(self) -> list[str]:
        return []

    async def render_prompt(self, name: str, **kwargs: Any) -> dict[str, Any]:
        return {"name": name, "rendered": ""}

    async def generate_itinerary(
        self,
        session: AsyncSession,
        trip_id: str,
        goal: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from app.services.trip_service import trip_service

        ctx = context or {}
        print(f"DEBUG GROQ_API_KEY = '{GROQ_API_KEY[:10]}...'")

        if GROQ_API_KEY:
            try:
                days = await self._generate_days_with_groq(goal, ctx)
                print("DEBUG: Groq itinerary generated successfully!")
            except Exception as e:
                print(f"Groq API error: {e}")
                if hasattr(e, 'response'):
                    print(f"Groq response body: {e.response.text}")
                days = self._build_itinerary_days(goal, ctx)
        else:
            print("DEBUG: No GROQ_API_KEY found, using mock")
            days = self._build_itinerary_days(goal, ctx)

        itinerary = await trip_service.save_itinerary(
            session=session,
            trip_id=trip_id,
            days=days,
            generated_by_ai=True,
            notes=f"AI-generated itinerary for: {goal}",
        )
        return itinerary

    async def regenerate_itinerary(
        self,
        session: AsyncSession,
        trip_id: str,
        goal: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self.generate_itinerary(session, trip_id, goal, context)

    async def _generate_days_with_groq(self, goal: str, context: dict[str, Any]) -> list[dict[str, Any]]:
        prompt = _build_prompt(goal, context)
        raw = await _call_groq(prompt)
        print(f"DEBUG Groq raw response: {raw[:200]}")
        days = _extract_json(raw)
        for day in days:
            day.setdefault("transportation", None)
            day.setdefault("accommodation", None)
            for act in day.get("activities", []):
                act.setdefault("cost_estimate", 0)
                act.setdefault("duration_minutes", 60)
                act.setdefault("notes", "")
        return days

    def _build_itinerary_days(self, goal: str, context: dict[str, Any]) -> list[dict[str, Any]]:
        destinations = sorted(context.get("destinations", []), key=lambda d: d.get("order", 1))
        currency = context.get("currency", "INR")
        persons = int(context.get("persons", 1))
        try:
            start = date.fromisoformat(context["start_date"])
        except (KeyError, ValueError, TypeError):
            start = date.today()

        days: list[dict[str, Any]] = []
        day_num = 1
        for dest in destinations:
            city = dest.get("city", "Unknown City")
            country = dest.get("country", "India")
            duration = max(int(dest.get("duration_days", 2)), 1)
            is_first_dest = not days
            for i in range(duration):
                is_arrival_day = i == 0 and not is_first_dest
                day_date = (start + timedelta(days=day_num - 1)).isoformat()
                days.append(self._build_day(day_num, day_date, city, country, currency, persons, is_arrival_day, days[-1]["destination"] if days else city))
                day_num += 1

        if not days:
            days.append({"day_number": 1, "date": start.isoformat(), "title": f"Day 1 — {goal[:80]}", "destination": "TBD", "activities": [], "accommodation": None, "transportation": None, "budget_estimate": 0.0, "currency": currency})
        return days

    @staticmethod
    def _build_day(day_num, day_date, city, country, currency, persons, is_arrival_day, prev_city):
        title = f"Travel to {city}" if is_arrival_day else f"Day {day_num} in {city}"
        if is_arrival_day:
            activities = [
                {"time": "07:00", "title": f"Depart from {prev_city}", "location": prev_city, "category": "transport", "duration_minutes": 60, "cost_estimate": 0.0, "notes": "Check out and head to departure point"},
                {"time": "12:00", "title": f"Arrive in {city} & check in", "location": city, "category": "leisure", "duration_minutes": 90, "cost_estimate": 0.0, "notes": "Hotel check-in and freshen up"},
                {"time": "15:00", "title": "Neighbourhood walk", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 200.0 * persons, "notes": f"Get oriented in {city}"},
            ]
        else:
            activities = [
                {"time": "08:00", "title": "Breakfast", "location": city, "category": "food", "duration_minutes": 45, "cost_estimate": 250.0 * persons, "notes": "Local breakfast"},
                {"time": "10:00", "title": "Morning sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 180, "cost_estimate": 500.0 * persons, "notes": f"Explore key attractions in {city}"},
                {"time": "13:30", "title": "Lunch", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 400.0 * persons, "notes": f"Local cuisine of {city}"},
                {"time": "15:00", "title": "Afternoon experience", "location": city, "category": "leisure", "duration_minutes": 150, "cost_estimate": 350.0 * persons, "notes": "Museums, markets, or nature walks"},
                {"time": "19:30", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 75, "cost_estimate": 600.0 * persons, "notes": "Evening meal at a local restaurant"},
            ]
        return {
            "day_number": day_num, "date": day_date, "title": title, "destination": city,
            "activities": activities,
            "accommodation": {"name": f"Hotel {city} Central", "address": f"City Centre, {city}, {country}", "check_in": "14:00", "check_out": "11:00"},
            "transportation": {"mode": "cab", "from": prev_city, "to": city, "departure": "07:00", "arrival": "11:00", "booking_reference": ""} if is_arrival_day else None,
            "budget_estimate": round(sum(a["cost_estimate"] for a in activities), 2),
            "currency": currency,
        }


ai_service = AIService()
