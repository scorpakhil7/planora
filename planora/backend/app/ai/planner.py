from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings


@dataclass
class PlanStep:
    step_id: str
    description: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Plan:
    goal: str
    steps: list[PlanStep] = field(default_factory=list)


class PlannerService:
    """
    Thin AI planner service.
    Calls the configured LLM to decompose a goal into ordered steps.
    Replace the stub below with real LLM calls once API keys are set.
    """

    def __init__(self) -> None:
        self._model = settings.AI_DEFAULT_MODEL

    async def plan(self, goal: str, context: dict[str, Any] | None = None) -> Plan:
        """Generate a plan for the given goal."""
        # Stub — replace with actual LLM call (OpenAI / Anthropic / etc.)
        return Plan(
            goal=goal,
            steps=[
                PlanStep(step_id="step_1", description=f"Analyse goal: '{goal}'"),
                PlanStep(step_id="step_2", description="Gather required context"),
                PlanStep(step_id="step_3", description="Execute and verify"),
            ],
        )

    async def refine(self, plan: Plan, feedback: str) -> Plan:
        """Refine an existing plan based on feedback."""
        plan.steps.append(
            PlanStep(step_id=f"step_{len(plan.steps) + 1}", description=f"Refinement: {feedback}")
        )
        return plan


planner_service = PlannerService()
