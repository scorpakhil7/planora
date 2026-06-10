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
GROQ_MODEL = "llama-3.3-70b-versatile"


async def _call_groq(prompt: str) -> str:
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
                    {"role": "system", "content": "You are an expert Indian travel planner. Always respond with valid JSON only. No markdown, no explanation, no extra text. Never truncate the response."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 8000,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _extract_json(text: str) -> Any:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        text = text[start:end+1]
    return json.loads(text.strip())


def _build_prompt(goal: str, context: dict[str, Any]) -> str:
    destinations = context.get("destinations", [])
    start_date = context.get("start_date", date.today().isoformat())
    currency = context.get("currency", "INR")
    persons = int(context.get("persons", 1))
    budget = context.get("budget_total", 0)
    from_city = context.get("from_city", "")
    departure_time = context.get("departure_time", "09:00")

    dest_lines = "\n".join(
        f"- {d.get('city')}, {d.get('country', 'India')} for {d.get('duration_days', 2)} days"
        for d in sorted(destinations, key=lambda d: d.get("order", 1))
    )
    total_days = sum(int(d.get("duration_days", 2)) for d in destinations)
    first_city = destinations[0].get("city", "") if destinations else ""
    budget_per_person = int(budget / persons) if persons and budget else budget

    return f"""Create a {total_days}-day India travel itinerary in JSON.

FROM: {from_city} TO: {first_city}
START DATE: {start_date}
DEPARTURE TIME DAY 1: {departure_time}
TRAVELERS: {persons} persons
TOTAL BUDGET: {currency} {budget} ({currency} {budget_per_person} per person)
DESTINATIONS: {dest_lines}

STRICT RULES:
1. Day 1 is TRAVEL DAY: first activity = real transport at {departure_time} (real train/bus name + number + cost per person). Include auto/cab from station to hotel (~₹100-150). Include dinner.
2. Day 2 onwards: MUST include breakfast, lunch, AND dinner every day. Plan activities from 8am to 9pm.
3. Last day: include checkout, local transport to station, return journey to {from_city} with real train/bus.
4. For Tirupati: Day 2 = Tirumala hill darshan (TTD bus ₹50, Special Entry darshan ₹300, prasad ₹50). Include lunch and dinner.
5. accommodation object MUST include nightly_rate field with realistic hotel cost per night in INR.
6. NEVER leave any meal out. Every non-travel day must have breakfast + lunch + dinner.
7. All local transport between attractions must be listed as separate activities with cost.
8. Total of all day budget_estimates must not exceed {currency} {budget}.
9. Use real place names, real restaurant names, real train numbers.

Return ONLY this exact JSON structure:
[
  {{
    "day_number": 1,
    "date": "YYYY-MM-DD",
    "title": "Travel from {from_city} to {first_city}",
    "destination": "{first_city}",
    "activities": [
      {{
        "time": "17:00",
        "title": "Train name and number",
        "location": "{from_city} Railway Station",
        "category": "transport",
        "duration_minutes": 480,
        "cost_estimate": 600,
        "notes": "Book on IRCTC. Sleeper class ₹X per person."
      }},
      {{
        "time": "23:30",
        "title": "Auto to hotel",
        "location": "Tirupati Railway Station",
        "category": "transport",
        "duration_minutes": 15,
        "cost_estimate": 100,
        "notes": "Prepaid auto from station"
      }},
      {{
        "time": "23:45",
        "title": "Dinner",
        "location": "Hotel or nearby restaurant",
        "category": "food",
        "duration_minutes": 30,
        "cost_estimate": 150,
        "notes": "Light dinner after arrival"
      }}
    ],
    "accommodation": {{
      "name": "Hotel name",
      "address": "Area, City, State",
      "check_in": "23:30",
      "check_out": "11:00",
      "nightly_rate": 800
    }},
    "budget_estimate": 850,
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
        print(f"DEBUG context = from_city={ctx.get('from_city')}, budget={ctx.get('budget_total')}, departure={ctx.get('departure_time')}")

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
            print("DEBUG: No GROQ_API_KEY, using mock")
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
        print(f"DEBUG Groq raw (first 200): {raw[:200]}")
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
        from_city = context.get("from_city", "home city")
        departure_time = context.get("departure_time", "09:00")

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
                is_travel_day = i == 0 and is_first_dest
                day_date = (start + timedelta(days=day_num - 1)).isoformat()
                prev = from_city if is_first_dest and i == 0 else (days[-1]["destination"] if days else city)
                days.append(self._build_day(day_num, day_date, city, country, currency, persons, is_travel_day, prev, departure_time))
                day_num += 1

        if not days:
            days.append({"day_number": 1, "date": start.isoformat(), "title": "Day 1", "destination": "TBD", "activities": [], "accommodation": None, "transportation": None, "budget_estimate": 0.0, "currency": currency})
        return days

    @staticmethod
    def _build_day(day_num, day_date, city, country, currency, persons, is_travel_day, prev_city, departure_time="09:00"):
        title = f"Travel from {prev_city} to {city}" if is_travel_day else f"Day {day_num} in {city}"
        hotel_rate = 800
        if is_travel_day:
            activities = [
                {"time": departure_time, "title": f"Train/Bus from {prev_city} to {city}", "location": f"{prev_city} Railway Station", "category": "transport", "duration_minutes": 300, "cost_estimate": 600.0 * persons, "notes": f"Book on IRCTC or RedBus. Sleeper ~₹400-600 per person."},
                {"time": "15:00", "title": "Auto from station to hotel", "location": f"{city} Railway Station", "category": "transport", "duration_minutes": 20, "cost_estimate": 100.0 * persons, "notes": "Auto-rickshaw ~₹100-150"},
                {"time": "15:30", "title": "Check in & freshen up", "location": city, "category": "leisure", "duration_minutes": 60, "cost_estimate": 0.0, "notes": "Check into hotel"},
                {"time": "19:00", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": f"Local cuisine of {city}"},
            ]
        else:
            activities = [
                {"time": "08:00", "title": "Breakfast", "location": city, "category": "food", "duration_minutes": 45, "cost_estimate": 150.0 * persons, "notes": "Local breakfast"},
                {"time": "09:30", "title": "Auto to main attraction", "location": city, "category": "transport", "duration_minutes": 20, "cost_estimate": 80.0 * persons, "notes": "Auto-rickshaw ~₹80-120"},
                {"time": "10:00", "title": "Morning sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 150, "cost_estimate": 200.0 * persons, "notes": f"Key attractions in {city}"},
                {"time": "13:00", "title": "Lunch", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": "Local cuisine"},
                {"time": "15:00", "title": "Afternoon sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 150.0 * persons, "notes": "More local attractions"},
                {"time": "18:30", "title": "Auto back to hotel", "location": city, "category": "transport", "duration_minutes": 20, "cost_estimate": 80.0 * persons, "notes": "Auto-rickshaw back"},
                {"time": "19:30", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 250.0 * persons, "notes": "Evening meal at local restaurant"},
            ]
        return {
            "day_number": day_num, "date": day_date, "title": title, "destination": city,
            "activities": activities,
            "accommodation": {
                "name": f"Hotel {city} Central",
                "address": f"City Centre, {city}, {country}",
                "check_in": "14:00",
                "check_out": "11:00",
                "nightly_rate": hotel_rate
            },
            "transportation": None,
            "budget_estimate": round(sum(a["cost_estimate"] for a in activities) + hotel_rate, 2),
            "currency": currency,
        }


ai_service = AIService()
