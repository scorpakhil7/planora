from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import DocumentType

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.trip import Trip


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Renamed from `type` for clarity; uses DocumentType enum values
    document_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        comment="DocumentType enum: passport | visa | flight_ticket | train_ticket | ..."
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    # Raw metadata (file size, mime type, upload info, etc.)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    # Structured data extracted from the document (OCR / AI parse result)
    parsed_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="documents")
    trip: Mapped[Trip | None] = relationship("Trip", back_populates="documents")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "trip_id": str(self.trip_id) if self.trip_id else None,
            "document_type": self.document_type,
            "filename": self.filename,
            "storage_path": self.storage_path,
            "metadata": self.metadata_,
            "parsed_data": self.parsed_data,
            "is_deleted": self.is_deleted,
        }
