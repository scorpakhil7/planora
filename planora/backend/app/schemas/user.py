from pydantic import BaseModel, EmailStr, Field


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=20)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class Traveler(BaseModel):
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    relation: str | None = Field(None, max_length=50)  # e.g. parent, spouse, child, sibling
    age: int | None = Field(None, ge=0, le=120)
    dietary: str | None = Field(None, max_length=100)
    accessibility_needs: str | None = Field(None, max_length=255)


class TravelersUpdate(BaseModel):
    travelers: list[Traveler] = []


class TravelPreferences(BaseModel):
    dietary: str | None = None  # vegetarian / non_vegetarian / vegan / jain / none
    hotel_tier: str | None = None  # dharmashala / budget / mid_range / premium / luxury
    seat_class: str | None = None  # sleeper / ac_3tier / ac_2tier / ac_1tier / economy / business


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    is_verified: bool
    preferences: dict = {}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
