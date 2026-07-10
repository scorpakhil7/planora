from __future__ import annotations

import os
import httpx

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "5eb560f267msh96cffb35e0b9773p17f86ajsnb40a4f7d7ed5")
RAPIDAPI_HOST = "irctc-indian-railway-pnr-status.p.rapidapi.com"
RAPIDAPI_BASE = f"https://{RAPIDAPI_HOST}"

CLASS_MAP = {
    "SL": "Sleeper (SL)", "3A": "Third AC (3A)", "2A": "Second AC (2A)",
    "1A": "First AC (1A)", "CC": "Chair Car (CC)", "2S": "Second Sitting (2S)",
    "EC": "Exec Chair Car (EC)", "FC": "First Class (FC)",
}

BERTH_MAP = {
    "LB": "Lower", "UB": "Upper", "MB": "Middle",
    "SL": "Side Lower", "SU": "Side Upper", "WS": "Window Side",
}

def _parse_date_time(dt_str: str) -> tuple[str, str]:
    """
    Parses 'Aug 16, 2026 8:05:00 PM' into ('Aug 16, 2026', '20:05')
    Returns (date, time) tuple.
    """
    if not dt_str:
        return "", ""
    try:
        from datetime import datetime
        dt = datetime.strptime(dt_str.strip(), "%b %d, %Y %I:%M:%S %p")
        return dt.strftime("%d %b %Y"), dt.strftime("%H:%M")
    except Exception:
        return dt_str, ""


async def check_pnr(pnr: str) -> dict:
    """
    Fetches live PNR status from RapidAPI IRCTC endpoint.
    Never raises — errors returned as found=False with error key.
    """
    pnr = pnr.strip()

    if not pnr.isdigit() or len(pnr) != 10:
        return {"pnr": pnr, "found": False, "error": "PNR must be exactly 10 digits."}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{RAPIDAPI_BASE}/getPNRStatus/{pnr}",
                headers={
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 404:
            return {"pnr": pnr, "found": False, "error": "PNR not found. It may be invalid or expired."}
        if resp.status_code in (401, 403):
            return {"pnr": pnr, "found": False, "error": "Invalid API key. Check your RAPIDAPI_KEY."}
        if resp.status_code == 429:
            return {"pnr": pnr, "found": False, "error": "Rate limit hit. Please try again in a moment."}

        resp.raise_for_status()
        body = resp.json()

        # Response is nested under "data"
        data = body.get("data", body)

        # ── Departure & arrival times ─────────────────────────────────────────
        dep_date, dep_time = _parse_date_time(data.get("dateOfJourney", ""))
        _, arr_time = _parse_date_time(data.get("arrivalDate", ""))

        # ── Passengers ────────────────────────────────────────────────────────
        raw_passengers = data.get("passengerList", [])
        passengers = []
        for p in raw_passengers:
            coach = p.get("currentCoachId") or p.get("bookingCoachId", "")
            berth_no = p.get("currentBerthNo") or p.get("bookingBerthNo", "")
            berth_code = p.get("currentBerthCode") or p.get("bookingBerthCode", "")
            berth_label = BERTH_MAP.get(berth_code, berth_code)

            booking_status = p.get("bookingStatus", "")
            current_status = p.get("currentStatus", "")

            passengers.append({
                "number": p.get("passengerSerialNumber", len(passengers) + 1),
                "booking_status": booking_status,
                "current_status": current_status,
                "coach": coach,
                "berth": f"{berth_no} {berth_label}".strip() if berth_no else "",
            })

        # ── Journey class ─────────────────────────────────────────────────────
        raw_class = data.get("journeyClass", "")
        journey_class = CLASS_MAP.get(raw_class.upper(), raw_class)

        return {
            "pnr": pnr,
            "found": True,
            "train_number": data.get("trainNumber", ""),
            "train_name": data.get("trainName", "").title(),
            "date_of_journey": dep_date,
            "from_station": data.get("sourceStation", ""),
            "to_station": data.get("destinationStation", ""),
            "departure_time": dep_time,
            "arrival_time": arr_time,
            "journey_class": journey_class,
            "chart_status": data.get("chartStatus", "Chart Not Prepared"),
            "passengers": passengers,
        }

    except httpx.TimeoutException:
        return {"pnr": pnr, "found": False, "error": "Request timed out. Please try again."}
    except httpx.HTTPStatusError as e:
        return {"pnr": pnr, "found": False, "error": f"API error ({e.response.status_code}). Try again shortly."}
    except Exception:
        return {"pnr": pnr, "found": False, "error": "Something went wrong. Please try again."}