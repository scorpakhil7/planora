"""
Central enum definitions shared across ORM models, Pydantic schemas, and services.
DB columns store string values; Python enums enforce valid values at the application layer.
"""
from enum import Enum


class BookingType(str, Enum):
    train = "train"
    bus = "bus"
    flight = "flight"
    hotel = "hotel"


class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    failed = "failed"


class TripStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    upi = "upi"
    card = "card"
    wallet = "wallet"
    netbanking = "netbanking"
    cash = "cash"


class UpiApp(str, Enum):
    gpay = "gpay"
    phonepe = "phonepe"
    paytm = "paytm"
    bhim = "bhim"
    other = "other"


class DocumentType(str, Enum):
    passport = "passport"
    visa = "visa"
    flight_ticket = "flight_ticket"
    train_ticket = "train_ticket"
    bus_ticket = "bus_ticket"
    hotel_voucher = "hotel_voucher"
    travel_insurance = "travel_insurance"
    id_proof = "id_proof"
    other = "other"
