from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    DB_PATH: str = "data/tankstellen-alert.db"


settings = Settings()
