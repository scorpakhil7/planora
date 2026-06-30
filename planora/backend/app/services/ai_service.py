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
                    {
                        "role": "system",
                        "content": (
                            "You are an expert Indian travel planner with accurate knowledge of Indian Railways train schedules, "
                            "bus routes, and local transport. Always respond with valid JSON only. "
                            "No markdown, no explanation, no extra text. Never truncate the response. "
                            "CRITICAL: Only use train timings you are confident are accurate. "
                            "If unsure of exact timings, say so in notes and provide the IRCTC link to verify. "
                            "Never fabricate departure or arrival times."
                        )
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.4,
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
PREFERRED DEPARTURE TIME: {departure_time}
TRAVELERS: {persons} persons
TOTAL BUDGET: {currency} {budget} ({currency} {budget_per_person} per person)
DESTINATIONS: {dest_lines}

TRANSPORT ACCURACY RULES (most important):
- Only use train numbers and names you are confident exist on the {from_city} to {first_city} route
- Use the ACTUAL departure time of that train — do NOT use {departure_time} as the departure if the real train departs at a different time
- {departure_time} is the traveler's PREFERRED time — pick the real train closest to that time
- If a train departs at 18:00 and arrives next day 06:00, show exactly that — arrival on Day 2 morning
- If traveler arrives early morning (before 07:00), Day 1 activities should be: arrive → check in → rest → light exploration in afternoon only
- NEVER show a train arriving in 3-4 hours if the actual journey is 10-12 hours
- In notes field for every transport, add: "⚠️ Verify timings on IRCTC before booking" and include booking link


DAY STRUCTURE RULES:
1. DAY 1 (TRAVEL DAY):
   - Breakfast at home before departure (1 hour before train/bus time)
   - Real train/bus with ACCURATE departure time (closest to {departure_time})
   - If overnight journey: arrival next morning, check in, rest, light evening exploration only
   - If same-day arrival: auto to hotel, freshen up, evening sightseeing, dinner
   - accommodation nightly_rate = realistic INR per night

2. DAY 2+ (FULL DAYS):
   - Breakfast 07:00-08:00
   - Auto/transport to each attraction separately with cost
   - Lunch 13:00-14:00
   - Afternoon attractions with transport
   - Dinner 19:00-20:00
   - Every movement between locations = separate transport activity with cost

3. FOR TIRUPATI specifically:
   - Tirumala darshan: TTD Bus (₹50), Special Entry Darshan (₹300 per person, book at https://tirupatibalaji.ap.gov.in), Prasad/Laddu (₹50), Temple canteen lunch (₹80-100), TTD Bus back (₹50)
   - Other Tirupati temples: Govindarajaswami, Kapila Theertham, ISKCON — all free entry, auto between them

4. LAST DAY:
   - Breakfast, checkout 11:00
   - Auto to station
   - Return journey with ACCURATE train timings and IRCTC booking link
   - Lunch on train if journey > 4 hours

5. LOCAL TRANSPORT:
   - Auto short ₹40-80, medium ₹80-150, long ₹150-300
   - Every attraction needs auto before it

Return ONLY valid JSON array, no other text:
[
  {{
    "day_number": 1,
    "date": "YYYY-MM-DD",
    "title": "Travel from {from_city} to {first_city}",
    "destination": "{first_city}",
    "activities": [
      {{
        "time": "HH:MM",
        "title": "Breakfast before departure",
        "location": "{from_city}",
        "category": "food",
        "duration_minutes": 30,
        "cost_estimate": 0,
        "notes": "Have breakfast at home before leaving"
      }},
      {{
        "time": "HH:MM",
        "title": "Train/Bus name and number",
        "location": "{from_city} Railway Station",
        "category": "transport",
        "duration_minutes": 720,
        "cost_estimate": 600,
        "notes": "Sleeper class ₹X per person. Book at https://www.irctc.co.in/nget/train-search | ⚠️ Verify exact timings on IRCTC before booking"
      }}
    ],
    "accommodation": {{
      "name": "Hotel name",
      "address": "Area, City, State",
      "check_in": "HH:MM",
      "check_out": "11:00",
      "nightly_rate": 900
    }},
    "budget_estimate": 1820,
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
        hotel_rate = 900
        dep_hour = int(departure_time.split(":")[0])
        breakfast_time = f"{max(dep_hour - 1, 6):02d}:00"

        if is_travel_day:
            activities = [
                {"time": breakfast_time, "title": "Breakfast before departure", "location": prev_city, "category": "food", "duration_minutes": 30, "cost_estimate": 0, "notes": "Have breakfast at home before leaving"},
                {"time": departure_time, "title": f"Train/Bus from {prev_city} to {city}", "location": f"{prev_city} Railway Station", "category": "transport", "duration_minutes": 600, "cost_estimate": 600.0 * persons, "notes": f"Book at https://www.irctc.co.in/nget/train-search | ⚠️ Verify exact timings on IRCTC before booking"},
                {"time": "06:00", "title": "Arrive & auto to hotel", "location": f"{city} Railway Station", "category": "transport", "duration_minutes": 20, "cost_estimate": 120.0 * persons, "notes": "Prepaid auto ~₹100-150"},
                {"time": "06:30", "title": "Check in & rest", "location": city, "category": "leisure", "duration_minutes": 180, "cost_estimate": 0, "notes": "Check in early, freshen up and rest after overnight journey"},
                {"time": "13:00", "title": "Lunch", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": f"First meal at {city}. Try local specialties."},
                {"time": "15:00", "title": "Light evening exploration", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 100.0 * persons, "notes": "Light sightseeing near hotel after rest"},
                {"time": "19:00", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": f"Local cuisine of {city}"},
            ]
        else:
            activities = [
                {"time": "07:30", "title": "Breakfast", "location": city, "category": "food", "duration_minutes": 45, "cost_estimate": 150.0 * persons, "notes": "Breakfast at hotel or nearby"},
                {"time": "09:00", "title": "Auto to morning attraction", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 80.0 * persons, "notes": "Auto-rickshaw ~₹80-100"},
                {"time": "09:15", "title": "Morning sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 150.0 * persons, "notes": f"Key attractions in {city}"},
                {"time": "11:30", "title": "Auto to next attraction", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 60.0 * persons, "notes": "Auto-rickshaw ~₹50-80"},
                {"time": "11:45", "title": "Second attraction", "location": city, "category": "sightseeing", "duration_minutes": 90, "cost_estimate": 100.0 * persons, "notes": f"Another key spot in {city}"},
                {"time": "13:30", "title": "Auto to restaurant", "location": city, "category": "transport", "duration_minutes": 10, "cost_estimate": 50.0 * persons, "notes": "Auto to lunch"},
                {"time": "13:45", "title": "Lunch", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": "Local cuisine"},
                {"time": "15:30", "title": "Auto to afternoon attraction", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 70.0 * persons, "notes": "Auto ~₹70-100"},
                {"time": "15:45", "title": "Afternoon sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 90, "cost_estimate": 100.0 * persons, "notes": "Afternoon exploration"},
                {"time": "18:00", "title": "Auto back to hotel", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 80.0 * persons, "notes": "Auto back"},
                {"time": "19:30", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 250.0 * persons, "notes": "Evening meal"},
            ]
        return {
            "day_number": day_num, "date": day_date, "title": title, "destination": city,
            "activities": activities,
            "accommodation": {
                "name": f"Hotel {city} Central",
                "address": f"City Centre, {city}, {country}",
                "check_in": "07:00", "check_out": "11:00",
                "nightly_rate": hotel_rate
            },
            "transportation": None,
            "budget_estimate": round(sum(a["cost_estimate"] for a in activities) + hotel_rate, 2),
            "currency": currency,
        }


ai_service = AIService()
