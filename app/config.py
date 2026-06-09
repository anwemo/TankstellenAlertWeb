from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_PATH: str = "data/tankstellen-alert.db"


settings = Settings()
