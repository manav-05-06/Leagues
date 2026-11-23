import os

from pydantic import BaseModel


class Settings(BaseModel):
    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
        ).split(",")
        if origin.strip()
    ]
    espn_timeout_seconds: float = float(os.getenv("ESPN_TIMEOUT_SECONDS", "10.0"))
    cache_live_ttl: int = int(os.getenv("CACHE_LIVE_TTL", "20"))
    cache_finished_ttl: int = int(os.getenv("CACHE_FINISHED_TTL", "86400"))
    # Optional regex for extra allowed origins, e.g. every Vercel preview URL:
    # https://leagues-fb(-[a-z0-9-]+)?\.vercel\.app
    allowed_origin_regex: str | None = os.getenv("ALLOWED_ORIGIN_REGEX") or None
    admin_token: str = os.getenv("ADMIN_TOKEN", "")


settings = Settings()
