from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings


# ---------------------------------------------------------------------------
# Existing data records (unchanged)
# ---------------------------------------------------------------------------

@dataclass
class BudgetRecord:
    id: str
    trip_id: str
    total_budget: float
    currency: str
    spent: float = 0.0
    breakdown: dict[str, float] = field(default_factory=dict)


@dataclass
class ExpenseRecord:
    id: str
    budget_id: str
    category: str
    amount: float
    note: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Budget Engine — input / output structures
# ---------------------------------------------------------------------------

@dataclass
class TransportItem:
    """A single transport leg for the trip."""
    mode: str           # flight | train | bus | cab | other
    segment: str        # e.g. "DEL → BOM"
    amount: float       # total cost for this leg (INR)
    persons: int = 1    # number of travellers on this leg


@dataclass
class AccommodationItem:
    """A single accommodation stay."""
    name: str
    location: str
    per_night: float    # cost per night (INR)
    nights: int


@dataclass
class ActivityItem:
    """A single activity or experience."""
    name: str
    amount: float       # total activity cost (INR)
    persons: int = 1


@dataclass
class MiscItem:
    """Miscellaneous expense (meals, travel insurance, visas, shopping, etc.)."""
    name: str
    amount: float


@dataclass
class TripCostInput:
    """
    Full cost input for a trip.
    All amounts are in INR by default.
    """
    transport: list[TransportItem] = field(default_factory=list)
    accommodation: list[AccommodationItem] = field(default_factory=list)
    activities: list[ActivityItem] = field(default_factory=list)
    misc: list[MiscItem] = field(default_factory=list)
    persons: int = 1
    currency: str = "INR"


@dataclass
class CostBreakdown:
    transport: float
    accommodation: float
    activities: float
    misc: float

    @property
    def total(self) -> float:
        return self.transport + self.accommodation + self.activities + self.misc

    def to_dict(self) -> dict[str, float]:
        return {
            "transport": round(self.transport, 2),
            "accommodation": round(self.accommodation, 2),
            "activities": round(self.activities, 2),
            "misc": round(self.misc, 2),
        }


@dataclass
class OptimizationSuggestion:
    category: str
    description: str
    current_cost: float
    suggested_cost: float
    saving: float
    confidence: float           # 0.0 – 1.0; derived from saving magnitude
    reason: str                 # human-readable explanation of why this suggestion applies
    options: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "description": self.description,
            "current_cost": round(self.current_cost, 2),
            "suggested_cost": round(self.suggested_cost, 2),
            "saving": round(self.saving, 2),
            "confidence": self.confidence,
            "reason": self.reason,
            "options": self.options,
        }


@dataclass
class BudgetEstimate:
    total_cost: float
    per_person_cost: float
    breakdown: dict[str, float]
    suggestions: list[dict[str, Any]]
    currency: str = "INR"

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_cost": round(self.total_cost, 2),
            "per_person_cost": round(self.per_person_cost, 2),
            "breakdown": self.breakdown,
            "suggestions": self.suggestions,
            "currency": self.currency,
        }


class BudgetService:
    """Manages trip budget tracking, expense categorization, and cost estimation."""

    # -----------------------------------------------------------------------
    # Existing stub methods (retained for backward compatibility)
    # -----------------------------------------------------------------------

    async def create(self, trip_id: str, total: float, currency: str = "INR") -> BudgetRecord:
        """Initialize a budget for a trip."""
        raise NotImplementedError

    async def get(self, budget_id: str) -> BudgetRecord | None:
        """Retrieve budget by ID."""
        return None

    async def add_expense(self, budget_id: str, category: str, amount: float, note: str = "") -> ExpenseRecord:
        """Record a new expense against a budget."""
        raise NotImplementedError

    async def get_summary(self, budget_id: str) -> dict[str, Any]:
        """Return spend summary grouped by category."""
        return {"total_budget": 0, "spent": 0, "remaining": 0, "breakdown": {}}

    async def update_budget(self, budget_id: str, total: float) -> BudgetRecord:
        """Revise the total budget allocation."""
        raise NotImplementedError

    # -----------------------------------------------------------------------
    # Budget Engine — public API
    # -----------------------------------------------------------------------

    async def estimate(self, inp: TripCostInput) -> dict[str, Any]:
        """
        Main entry point for the budget engine.

        Accepts a `TripCostInput` and returns a fully structured estimate:
            {
                total_cost, per_person_cost,
                breakdown: { transport, accommodation, activities, misc },
                suggestions: [ ... ]
            }
        """
        breakdown = self._build_breakdown(inp)
        total = breakdown.total
        per_person = self._per_person_cost(total, inp.persons)
        suggestions = self._generate_suggestions(inp, breakdown)

        return BudgetEstimate(
            total_cost=total,
            per_person_cost=per_person,
            breakdown=breakdown.to_dict(),
            suggestions=[s.to_dict() for s in suggestions],
            currency=inp.currency,
        ).to_dict()

    async def estimate_from_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Convenience wrapper — accepts raw dict payload and normalises it into
        a `TripCostInput` before delegating to `estimate()`.

        Expected shape:
        {
            "persons": int,
            "currency": "INR",
            "transport": [{"mode": str, "segment": str, "amount": float, "persons": int}],
            "accommodation": [{"name": str, "location": str, "per_night": float, "nights": int}],
            "activities": [{"name": str, "amount": float, "persons": int}],
            "misc": [{"name": str, "amount": float}]
        }
        """
        inp = TripCostInput(
            persons=int(data.get("persons", 1)),
            currency=data.get("currency", "INR"),
            transport=[TransportItem(**t) for t in data.get("transport", [])],
            accommodation=[AccommodationItem(**a) for a in data.get("accommodation", [])],
            activities=[ActivityItem(**a) for a in data.get("activities", [])],
            misc=[MiscItem(**m) for m in data.get("misc", [])],
        )
        return await self.estimate(inp)

    # -----------------------------------------------------------------------
    # Cost calculation helpers (pure, synchronous, testable)
    # -----------------------------------------------------------------------

    def _build_breakdown(self, inp: TripCostInput) -> CostBreakdown:
        return CostBreakdown(
            transport=self._sum_transport(inp.transport),
            accommodation=self._sum_accommodation(inp.accommodation),
            activities=self._sum_activities(inp.activities),
            misc=self._sum_misc(inp.misc),
        )

    def _sum_transport(self, items: list[TransportItem]) -> float:
        return sum(item.amount for item in items)

    def _sum_accommodation(self, items: list[AccommodationItem]) -> float:
        return sum(item.per_night * item.nights for item in items)

    def _sum_activities(self, items: list[ActivityItem]) -> float:
        return sum(item.amount for item in items)

    def _sum_misc(self, items: list[MiscItem]) -> float:
        return sum(item.amount for item in items)

    def _per_person_cost(self, total: float, persons: int) -> float:
        if persons < 1:
            persons = 1
        return total / persons

    @staticmethod
    def _confidence_score(saving: float) -> float:
        """
        Derive a confidence score (0.0–1.0) from the magnitude of the saving.
          saving > ₹5,000  → 0.9  (high — significant financial impact)
          saving ₹2,000–5,000 → 0.7  (medium — worthwhile trade-off)
          saving < ₹2,000  → 0.5  (low — marginal saving)
        """
        if saving > 5_000:
            return 0.9
        if saving >= 2_000:
            return 0.7
        return 0.5

    # -----------------------------------------------------------------------
    # Optimization suggestion engine
    # -----------------------------------------------------------------------

    def _generate_suggestions(
        self,
        inp: TripCostInput,
        breakdown: CostBreakdown,
    ) -> list[OptimizationSuggestion]:
        suggestions: list[OptimizationSuggestion] = []
        suggestions.extend(self._transport_suggestions(inp.transport, inp.persons))
        suggestions.extend(self._accommodation_suggestions(inp.accommodation, inp.persons))
        suggestions.extend(self._activity_suggestions(inp.activities))
        suggestions.extend(self._misc_suggestions(inp.misc))
        return suggestions

    def _transport_suggestions(
        self,
        items: list[TransportItem],
        persons: int,
    ) -> list[OptimizationSuggestion]:
        suggestions = []
        for item in items:
            cost_per_person = item.amount / max(item.persons, 1)
            if cost_per_person <= settings.TRANSPORT_COST_THRESHOLD:
                continue

            alternatives = self._cheaper_transport_options(item)
            if not alternatives:
                continue

            best_alt_cost = min(a["estimated_cost"] for a in alternatives)
            saving = max(item.amount - best_alt_cost, 0)

            suggestions.append(OptimizationSuggestion(
                category="transport",
                description=(
                    f"Your {item.mode} on {item.segment} costs ₹{item.amount:,.0f}. "
                    f"Cheaper alternatives could save up to ₹{saving:,.0f}."
                ),
                current_cost=item.amount,
                suggested_cost=best_alt_cost,
                saving=saving,
                confidence=self._confidence_score(saving),
                reason=(
                    f"{item.mode.capitalize()} cost on {item.segment} is significantly above "
                    f"the ₹{settings.TRANSPORT_COST_THRESHOLD:,.0f}/person threshold; "
                    "ground transport alternatives offer comparable connectivity at a fraction of the price."
                ),
                options=alternatives,
            ))

        return suggestions

    def _cheaper_transport_options(self, item: TransportItem) -> list[dict[str, Any]]:
        """
        Mock catalogue of cheaper alternatives for a given transport leg.
        In production, replace with live pricing calls.
        """
        mode = item.mode.lower()
        cost = item.amount

        alternatives: list[dict[str, Any]] = []

        if mode == "flight":
            alternatives = [
                {
                    "mode": "train",
                    "operator": "Indian Railways (Rajdhani / Shatabdi)",
                    "estimated_cost": round(cost * 0.35, 2),
                    "duration": "Longer — typically 6-18 h",
                    "trade_off": "Significant time cost; comfortable sleeper classes available",
                },
                {
                    "mode": "bus",
                    "operator": "Volvo / VRL Sleeper",
                    "estimated_cost": round(cost * 0.15, 2),
                    "duration": "Longest — overnight journeys",
                    "trade_off": "Lowest cost; comfort depends on route/operator",
                },
            ]
        elif mode == "train":
            alternatives = [
                {
                    "mode": "bus",
                    "operator": "KSRTC / MSRTC / Private AC Bus",
                    "estimated_cost": round(cost * 0.55, 2),
                    "duration": "Similar or slightly longer",
                    "trade_off": "Cheaper; fewer premium options",
                },
            ]
        elif mode == "cab":
            alternatives = [
                {
                    "mode": "train",
                    "operator": "Indian Railways",
                    "estimated_cost": round(cost * 0.25, 2),
                    "duration": "Variable",
                    "trade_off": "Much cheaper; requires station transfers",
                },
                {
                    "mode": "bus",
                    "operator": "State / Private Bus",
                    "estimated_cost": round(cost * 0.10, 2),
                    "duration": "Similar",
                    "trade_off": "Cheapest; less flexible timing",
                },
            ]

        return alternatives

    def _accommodation_suggestions(
        self,
        items: list[AccommodationItem],
        persons: int,
    ) -> list[OptimizationSuggestion]:
        suggestions = []
        for item in items:
            cost_per_night_per_person = item.per_night / max(persons, 1)
            if cost_per_night_per_person <= settings.ACCOMMODATION_COST_THRESHOLD:
                continue

            alternatives = self._cheaper_accommodation_options(item, persons)
            if not alternatives:
                continue

            best_alt_total = min(a["estimated_total"] for a in alternatives)
            current_total = item.per_night * item.nights
            saving = max(current_total - best_alt_total, 0)

            suggestions.append(OptimizationSuggestion(
                category="accommodation",
                description=(
                    f"'{item.name}' in {item.location} costs ₹{current_total:,.0f} "
                    f"over {item.nights} night(s). Switching could save ₹{saving:,.0f}."
                ),
                current_cost=current_total,
                suggested_cost=best_alt_total,
                saving=saving,
                confidence=self._confidence_score(saving),
                reason=(
                    f"Accommodation cost of ₹{item.per_night:,.0f}/night at '{item.name}' "
                    f"exceeds the typical ₹{settings.ACCOMMODATION_COST_THRESHOLD:,.0f}/night/person "
                    f"range for {item.location}; alternative property types offer similar comfort at lower rates."
                ),
                options=alternatives,
            ))

        return suggestions

    def _cheaper_accommodation_options(
        self,
        item: AccommodationItem,
        persons: int,
    ) -> list[dict[str, Any]]:
        """
        Mock catalogue of budget-friendly accommodation alternatives.
        In production, connect to hotel search adapters.
        """
        per_night = item.per_night
        nights = item.nights

        alternatives: list[dict[str, Any]] = [
            {
                "type": "3-star hotel",
                "description": f"Budget 3-star near {item.location}",
                "per_night": round(per_night * 0.45, 2),
                "estimated_total": round(per_night * 0.45 * nights, 2),
                "trade_off": "Less amenities; comfortable for short stays",
            },
            {
                "type": "Hostel / Guesthouse",
                "description": f"Backpacker hostel or B&B in {item.location}",
                "per_night": round(per_night * 0.20, 2),
                "estimated_total": round(per_night * 0.20 * nights, 2),
                "trade_off": "Shared facilities possible; great for solo travellers",
            },
            {
                "type": "Airbnb / Homestay",
                "description": "Private room or apartment stay",
                "per_night": round(per_night * 0.35, 2),
                "estimated_total": round(per_night * 0.35 * nights, 2),
                "trade_off": "Home-like experience; cost-effective for groups",
            },
        ]
        return alternatives

    def _activity_suggestions(
        self,
        items: list[ActivityItem],
    ) -> list[OptimizationSuggestion]:
        suggestions = []
        expensive = [a for a in items if a.amount > settings.ACTIVITY_COST_THRESHOLD]

        if not expensive:
            return suggestions

        free_alternatives = [
            "Visit public parks, beaches, and heritage sites (many are free or low entry fee)",
            "City walking tours — often free or donation-based",
            "Local markets and festivals — immersive and free",
        ]

        total_expensive = sum(a.amount for a in expensive)
        suggested = round(total_expensive * 0.40, 2)
        saving = max(total_expensive - suggested, 0)

        suggestions.append(OptimizationSuggestion(
            category="activities",
            description=(
                f"{len(expensive)} high-cost activity(ies) total ₹{total_expensive:,.0f}. "
                "Mixing in free local experiences can significantly reduce this."
            ),
            current_cost=total_expensive,
            suggested_cost=suggested,
            saving=saving,
            confidence=self._confidence_score(saving),
            reason=(
                f"Activity pricing is above the ₹{settings.ACTIVITY_COST_THRESHOLD:,.0f} standard "
                "tourist rate; free and low-cost cultural alternatives provide equivalent experiences "
                "without the premium markup."
            ),
            options=[{"suggestion": tip} for tip in free_alternatives],
        ))

        return suggestions

    def _misc_suggestions(
        self,
        items: list[MiscItem],
    ) -> list[OptimizationSuggestion]:
        suggestions = []
        total_misc = sum(m.amount for m in items)

        if total_misc < settings.MISC_COST_THRESHOLD:
            return suggestions

        saving = round(total_misc * 0.25, 2)

        suggestions.append(OptimizationSuggestion(
            category="misc",
            description=(
                f"Miscellaneous expenses total ₹{total_misc:,.0f}. "
                "Small adjustments across meals and incidentals can trim 20-30%."
            ),
            current_cost=total_misc,
            suggested_cost=round(total_misc * 0.75, 2),
            saving=saving,
            confidence=self._confidence_score(saving),
            reason=(
                f"Miscellaneous spend of ₹{total_misc:,.0f} exceeds the ₹{settings.MISC_COST_THRESHOLD:,.0f} "
                "baseline; simple on-trip lifestyle choices can reduce incidental costs by 20-30% "
                "without impacting travel quality."
            ),
            options=[
                {"suggestion": "Eat at local dhabas and street stalls instead of restaurants"},
                {"suggestion": "Use public transport (metro/bus) instead of cabs within cities"},
                {"suggestion": "Carry a reusable water bottle — avoid buying packaged water daily"},
                {"suggestion": "Book travel insurance in advance for better rates"},
            ],
        ))

        return suggestions


budget_service = BudgetService()
