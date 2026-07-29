from pydantic_settings import BaseSettings
from pathlib import Path

ENV_PATH = path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    DATABASE_URL : str
    SECRET_KEY : str
    GEMINI_MODEL : str
    GEMINI_API_KEY : str
    ACCESS_TOKEN_EXPIRE_MINUTES : int = 120
    REFRESH_TOKEN_EXPIRES_DAYS : INT = 30
    ALLOWED_HOSTS : STR = "*"


    @property
    def allowed_hosts_list(self)-> list[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    class Config :
        env_file = ENV_PATH
        env_file_encoding = "utf-8"

settings = Settings()