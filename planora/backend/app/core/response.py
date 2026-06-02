from typing import Any
from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    error: str | None = None


def ok(data: Any = None) -> dict:
    return ApiResponse(success=True, data=data, error=None).model_dump()


def fail(error: str, data: Any = None) -> dict:
    return ApiResponse(success=False, data=data, error=error).model_dump()
