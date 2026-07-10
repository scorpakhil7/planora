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

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
TAVILY_URL = "https://api.tavily.com/search"


async def _search_transport_info(from_city: str, to_city: str) -> str:
    """Search for real train/bus timings between two cities."""
    if not TAVILY_API_KEY or not from_city or not to_city:
        return ""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                TAVILY_URL,
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": f"{from_city} to {to_city} train timing schedule departure arrival 2024",
                    "max_results": 3,
                    "search_depth": "basic",
                },
            )
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return ""
            combined = "\n".join(
                f"- {r.get('title', '')}: {r.get('content', '')[:400]}"
                for r in results
            )
            print(f"DEBUG Tavily found {len(results)} results for {from_city}→{to_city}")
            return combined
    except Exception as e:
        print(f"Tavily search error: {e}")
        return ""


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
                            "You are an expert Indian travel planner. "
                            "Always respond with valid JSON only. No markdown, no explanation. "
                            "When real train data is provided, use those EXACT timings. "
                            "Never fabricate timings if real data is available."
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
    transport_data = context.get("transport_search_results", "")
    pilgrimage_mode = context.get("pilgrimage_mode", False)
    darshan_type = context.get("darshan_type", "general")
    pilgrimage_accommodation = context.get("pilgrimage_accommodation", "budget_hotel")

    dest_lines = "\n".join(
        f"- {d.get('city')}, {d.get('country', 'India')} for {d.get('duration_days', 2)} days"
        for d in sorted(destinations, key=lambda d: d.get("order", 1))
    )
    total_days = sum(int(d.get("duration_days", 2)) for d in destinations)
    first_city = destinations[0].get("city", "") if destinations else ""
    budget_per_person = int(budget / persons) if persons and budget else budget

    # Build transport section
    if transport_data:
        transport_section = f"""
REAL TRANSPORT DATA FROM WEB SEARCH (use these EXACT timings, do not change them):
{transport_data}

IMPORTANT: The above is real search data. Extract actual train names, numbers, departure times and arrival times from it.
Use the train whose departure time is closest to {departure_time}.
If the journey is overnight, show arrival next morning and adjust Day 1 activities accordingly.
"""
    else:
        transport_section = f"""
No real-time transport data available. Use your best knowledge of typical trains on this route.
Pick a train whose departure is closest to {departure_time}.
For routes over 400km, assume overnight journey (depart evening, arrive next morning).
Be honest if unsure — write approximate timings.
"""

    # ── Pilgrimage section ───────────────────────────────────────────────────
    darshan_labels = {
        "general": "General Darshan (free, expect 2–6 hour queue)",
        "special_entry": "Special Entry Darshan (₹300/person, 1–2 hour queue)",
        "vip": "VIP Darshan (₹1,000+/person, minimal wait — under 30 mins)",
    }
    accommodation_labels = {
        "dharmashala": "Dharmashala / pilgrim rest house (₹100–₹500/night, near temple)",
        "budget_hotel": "Budget hotel (₹500–₹1,500/night)",
        "hotel": "Regular hotel (₹1,500+/night)",
    }
    pilgrimage_section = ""
    if pilgrimage_mode:
        pilgrimage_section = f"""
PILGRIMAGE MODE — STRICT RULES (ALL MUST BE FOLLOWED):
1. ONLY suggest temples, ghats, ashrams, mosques, gurudwaras, churches, and sacred sites.
   NO malls, parks, museums (unless religious), nightlife, or regular tourist attractions.
2. Darshan preference: {darshan_labels.get(darshan_type, "General Darshan")}
   - Plan temple visit timing based on this — include realistic queue wait time as an activity.
3. Accommodation: {accommodation_labels.get(pilgrimage_accommodation, "Budget hotel")}
   - Use this type for the accommodation field in every day.
4. Include morning aarti time (if applicable) and evening aarti time for each temple.
5. Include prasad cost and donation box note for major temples.
6. Mention dress code requirements (no leather, covered head/shoulders etc.) in activity notes.
7. Include local pilgrimage transport (TTD buses, shared autos, palki for Vaishno Devi etc.)
8. Lunch and dinner at temple canteen / prasadam hall / vegetarian-only restaurants near temple.
9. Do NOT include alcohol, nightlife, or non-vegetarian food anywhere.
10. Day structure: Early morning aarti → darshan → breakfast → nearby sacred sites → lunch at temple canteen → more sacred sites / ashram visit → evening aarti → dinner → rest.
"""

    return f"""Create a {total_days}-day India travel itinerary in JSON.

FROM: {from_city} TO: {first_city}
START DATE: {start_date}
PREFERRED DEPARTURE TIME: {departure_time}
TRAVELERS: {persons} persons
TOTAL BUDGET: {currency} {budget} ({currency} {budget_per_person} per person)
{pilgrimage_section}
DESTINATIONS:
{dest_lines}

{transport_section}

DAY STRUCTURE RULES:
1. DAY 1 (TRAVEL DAY):
   - Breakfast at home 1 hour before departure
   - Transport activity at EXACT real departure time (from search data above)
   - If overnight journey: arrival next morning → check in → rest → lunch → light exploration → dinner
   - If same-day arrival: auto to hotel → check in → explore → dinner
   - accommodation nightly_rate = realistic INR

2. DAY 2+ (FULL DAYS — 8am to 9pm):
   - Breakfast 07:30
   - Auto/transport to each attraction (separate activity with cost)
   - Lunch 13:00-14:00
   - Afternoon attractions with transport between each
   - Dinner 19:30

3. FOR TIRUPATI: TTD Bus to Tirumala (₹50), Special Entry Darshan (₹300/person), Prasad (₹50), temple canteen lunch, TTD Bus back (₹50)

4. LAST DAY: Breakfast → checkout → auto to station → return train with REAL timings → lunch on train if long journey

5. LOCAL TRANSPORT: Auto between every attraction (₹40-150 per trip)

6. Budget: All days combined must not exceed {currency} {budget}

Return ONLY valid JSON array:
[
  {{
    "day_number": 1,
    "date": "YYYY-MM-DD",
    "title": "Travel from {from_city} to {first_city}",
    "destination": "{first_city}",
    "activities": [
      {{"time": "HH:MM", "title": "Activity", "location": "Place", "category": "transport", "duration_minutes": 60, "cost_estimate": 500, "notes": "Details"}}
    ],
    "accommodation": {{"name": "Hotel name", "address": "Area, City", "check_in": "HH:MM", "check_out": "11:00", "nightly_rate": 900}},
    "budget_estimate": 2000,
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
        from_city = ctx.get("from_city", "")
        destinations = ctx.get("destinations", [])
        first_city = destinations[0].get("city", "") if destinations else ""

        print(f"DEBUG GROQ_API_KEY = '{GROQ_API_KEY[:10]}...'")
        print(f"DEBUG TAVILY_API_KEY = '{TAVILY_API_KEY[:10]}...'")
        print(f"DEBUG context = from_city={from_city}, budget={ctx.get('budget_total')}, departure={ctx.get('departure_time')}")

        # Search for real transport data before calling AI
        if from_city and first_city:
            print(f"DEBUG Searching Tavily for: {from_city} → {first_city}")
            transport_data = await _search_transport_info(from_city, first_city)
            ctx["transport_search_results"] = transport_data
        else:
            ctx["transport_search_results"] = ""

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
                {"time": breakfast_time, "title": "Breakfast before departure", "location": prev_city, "category": "food", "duration_minutes": 30, "cost_estimate": 0, "notes": "Have breakfast before leaving"},
                {"time": departure_time, "title": f"Train/Bus from {prev_city} to {city}", "location": f"{prev_city} Railway Station", "category": "transport", "duration_minutes": 600, "cost_estimate": 600.0 * persons, "notes": "Book on IRCTC or RedBus"},
                {"time": "06:00", "title": "Arrive & auto to hotel", "location": f"{city} Station", "category": "transport", "duration_minutes": 20, "cost_estimate": 120.0 * persons, "notes": "Prepaid auto ~₹100-150"},
                {"time": "06:30", "title": "Check in & rest", "location": city, "category": "leisure", "duration_minutes": 180, "cost_estimate": 0, "notes": "Rest after overnight journey"},
                {"time": "13:00", "title": "Lunch", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": "First meal at destination"},
                {"time": "15:00", "title": "Light evening exploration", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 100.0 * persons, "notes": "Light sightseeing near hotel"},
                {"time": "19:00", "title": "Dinner", "location": city, "category": "food", "duration_minutes": 60, "cost_estimate": 200.0 * persons, "notes": f"Local cuisine of {city}"},
            ]
        else:
            activities = [
                {"time": "07:30", "title": "Breakfast", "location": city, "category": "food", "duration_minutes": 45, "cost_estimate": 150.0 * persons, "notes": "Breakfast at hotel"},
                {"time": "09:00", "title": "Auto to morning attraction", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 80.0 * persons, "notes": "Auto-rickshaw ~₹80-100"},
                {"time": "09:15", "title": "Morning sightseeing", "location": city, "category": "sightseeing", "duration_minutes": 120, "cost_estimate": 150.0 * persons, "notes": f"Key attractions in {city}"},
                {"time": "11:30", "title": "Auto to next attraction", "location": city, "category": "transport", "duration_minutes": 15, "cost_estimate": 60.0 * persons, "notes": "Auto ~₹50-80"},
                {"time": "11:45", "title": "Second attraction", "location": city, "category": "sightseeing", "duration_minutes": 90, "cost_estimate": 100.0 * persons, "notes": f"Another spot in {city}"},
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
            "accommodation": {"name": f"Hotel {city} Central", "address": f"City Centre, {city}, {country}", "check_in": "07:00", "check_out": "11:00", "nightly_rate": hotel_rate},
            "transportation": None,
            "budget_estimate": round(sum(a["cost_estimate"] for a in activities) + hotel_rate, 2),
            "currency": currency,
        }


ai_service = AIService()