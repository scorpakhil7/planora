from abc import ABC, abstractmethod
from typing import Any


class BaseOrchestrator(ABC):
    @abstractmethod
    async def process(self, input_data: dict[str, Any]) -> dict[str, Any]:
        pass
