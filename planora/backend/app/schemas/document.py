from typing import Any

from pydantic import BaseModel, Field

from app.db.enums import DocumentType


class DocumentCreate(BaseModel):
    document_type: DocumentType
    filename: str = Field(..., min_length=1, max_length=500)
    storage_path: str = Field(..., min_length=1, max_length=1000)
    trip_id: str | None = None
    metadata: dict[str, Any] = {}
    parsed_data: dict[str, Any] = {}


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    trip_id: str | None
    document_type: str
    filename: str
    storage_path: str
    metadata: dict[str, Any] = {}
    parsed_data: dict[str, Any] = {}
    is_deleted: bool = False
