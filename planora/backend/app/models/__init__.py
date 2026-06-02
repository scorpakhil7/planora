"""
Central import point for all ORM models.
Imported here so Alembic's env.py can discover every table
via a single `from app.models import *`.
"""
from app.db.base import Base  # noqa: F401
from app.db.models.user import User  # noqa: F401
from app.db.models.trip import Trip  # noqa: F401
from app.db.models.booking import Booking  # noqa: F401
from app.db.models.itinerary import Itinerary  # noqa: F401
from app.db.models.payment import Payment  # noqa: F401
from app.db.models.document import Document  # noqa: F401

__all__ = ["Base", "User", "Trip", "Booking", "Itinerary", "Payment", "Document"]
