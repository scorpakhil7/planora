"""Initial schema — users, trips, bookings, itineraries, payments, documents

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("preferences", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "trips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("origin", sa.String(255), nullable=False),
        sa.Column("destination", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("metadata", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trips_user_id", "trips", ["user_id"])

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("trip_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(100), nullable=False),
        sa.Column("reference", sa.String(255), nullable=False, server_default=""),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("metadata", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bookings_trip_id", "bookings", ["trip_id"])
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])

    op.create_table(
        "itineraries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("trip_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("days", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("generated_by_ai", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_itineraries_trip_id", "itineraries", ["trip_id"])

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("gateway", sa.String(100), nullable=False),
        sa.Column("transaction_id", sa.String(255), nullable=False, server_default=""),
        sa.Column("metadata", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_user_id", "payments", ["user_id"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trip_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trips.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("storage_path", sa.String(1000), nullable=False),
        sa.Column("metadata", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_trip_id", "documents", ["trip_id"])


def downgrade() -> None:
    op.drop_table("documents")
    op.drop_table("payments")
    op.drop_table("itineraries")
    op.drop_table("bookings")
    op.drop_table("trips")
    op.drop_table("users")
