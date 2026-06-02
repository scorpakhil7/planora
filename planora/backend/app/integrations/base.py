from abc import ABC, abstractmethod
from typing import Any


class BaseAdapter(ABC):
    """
    Abstract base for all external service adapters.
    Each integration (email, calendar, CRM, etc.) implements this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this adapter."""

    @abstractmethod
    async def initialize(self) -> None:
        """Perform any async setup (auth, connection pool, etc.)."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the integration is reachable."""

    @abstractmethod
    async def call(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Generic action dispatcher — map action strings to API calls."""
