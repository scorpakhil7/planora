from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Planora"
    VERSION: str = "0.0.1"
    DEBUG: bool = False

    DATABASE_URL: str = ""
    REDIS_URL: str = ""
    SECRET_KEY: str = "change-me-in-production"

    CORS_ORIGINS: str = "http://localhost:3000"

    AI_DEFAULT_MODEL: str = "gpt-4o"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Budget engine thresholds (INR) — override via environment variables
    TRANSPORT_COST_THRESHOLD: float = 8_000      # per leg per person
    ACCOMMODATION_COST_THRESHOLD: float = 5_000  # per night per person
    ACTIVITY_COST_THRESHOLD: float = 2_000       # per single activity
    MISC_COST_THRESHOLD: float = 3_000           # total miscellaneous spend

    class Config:
        eenv_file = r"C:\Users\Prashanthi\OneDrive\Desktop\planora-main\planora\.env"
        extra = "ignore"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not value:
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
