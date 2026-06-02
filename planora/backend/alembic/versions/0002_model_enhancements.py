"""Model enhancements — destinations, enums, payment methods, document types, soft delete

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # trips — replace origin/destination with destinations JSON list
    # -----------------------------------------------------------------------
    op.add_column("trips", sa.Column("destinations", postgresql.JSON(), nullable=False, server_default="[]"))
    op.drop_column("trips", "origin")
    op.drop_column("trips", "destination")

    # trips — soft delete
    op.add_column("trips", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("trips", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_trips_status", "trips", ["status"])

    # -----------------------------------------------------------------------
    # bookings — enums via indexed string columns + soft delete
    # -----------------------------------------------------------------------
    op.add_column("bookings", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("bookings", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_bookings_type", "bookings", ["type"])
    op.create_index("ix_bookings_status", "bookings", ["status"])

    # -----------------------------------------------------------------------
    # payments — payment_method, upi_app + soft delete
    # -----------------------------------------------------------------------
    op.add_column("payments", sa.Column("payment_method", sa.String(50), nullable=True))
    op.add_column("payments", sa.Column("upi_app", sa.String(50), nullable=True))
    op.add_column("payments", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("payments", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_payments_status", "payments", ["status"])

    # -----------------------------------------------------------------------
    # documents — document_type (rename type), parsed_data + soft delete
    # -----------------------------------------------------------------------
    op.alter_column("documents", "type", new_column_name="document_type")
    op.add_column("documents", sa.Column("parsed_data", postgresql.JSON(), nullable=False, server_default="{}"))
    op.add_column("documents", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("documents", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_documents_document_type", "documents", ["document_type"])

    # -----------------------------------------------------------------------
    # users — soft delete timestamp
    # -----------------------------------------------------------------------
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # users
    op.drop_column("users", "deleted_at")

    # documents
    op.drop_index("ix_documents_document_type", "documents")
    op.drop_column("documents", "deleted_at")
    op.drop_column("documents", "is_deleted")
    op.drop_column("documents", "parsed_data")
    op.alter_column("documents", "document_type", new_column_name="type")

    # payments
    op.drop_index("ix_payments_status", "payments")
    op.drop_column("payments", "deleted_at")
    op.drop_column("payments", "is_deleted")
    op.drop_column("payments", "upi_app")
    op.drop_column("payments", "payment_method")

    # bookings
    op.drop_index("ix_bookings_status", "bookings")
    op.drop_index("ix_bookings_type", "bookings")
    op.drop_column("bookings", "deleted_at")
    op.drop_column("bookings", "is_deleted")

    # trips
    op.drop_index("ix_trips_status", "trips")
    op.drop_column("trips", "deleted_at")
    op.drop_column("trips", "is_deleted")
    op.add_column("trips", sa.Column("destination", sa.String(255), nullable=False, server_default=""))
    op.add_column("trips", sa.Column("origin", sa.String(255), nullable=False, server_default=""))
    op.drop_column("trips", "destinations")
