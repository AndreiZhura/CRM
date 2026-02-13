from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://admin:password@localhost:5433/oleg_crm"
    YANDEX_API_KEY: str = ""

    class Config:
        env_file = "../../.env"
        extra = "ignore"

settings = Settings()