from pydantic_settings import BaseSettings
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    ALGORITHM: str = "HS256"
    DATABASE_URL: str
    SECRET_KEY: str

    # --- Gemini (Google GenAI) ---
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIM: int = 768  # must match Vector(768) in Models/embedding_model.py

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRES_DAYS: int = 30
    ALLOWED_HOSTS: str = "*"

    # --- Anomaly detection thresholds (all overridable via .env) ---
    LATENCY_WARNING_MS: int = 2000
    LATENCY_CRITICAL_MS: int = 5000
    DB_POOL_WARNING_PCT: int = 80
    DB_POOL_CRITICAL_PCT: int = 95
    RAG_TOP_K: int = 3

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    class Config:
        env_file = ENV_PATH
        env_file_encoding = "utf-8"

settings = Settings()
