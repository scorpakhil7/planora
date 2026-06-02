import os
from dataclasses import dataclass


@dataclass
class DatabaseConfig:
    url: str = os.getenv("DATABASE_URL", "")
    pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))


@dataclass
class RedisConfig:
    url: str = os.getenv("REDIS_URL", "")


@dataclass
class AIConfig:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    default_model: str = os.getenv("AI_DEFAULT_MODEL", "gpt-4o")


@dataclass
class AppConfig:
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    secret_key: str = os.getenv("SECRET_KEY", "")
    cors_origins: list[str] = None

    def __post_init__(self):
        if self.cors_origins is None:
            origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
            self.cors_origins = [o.strip() for o in origins.split(",")]
