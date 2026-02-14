from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://admin:password@localhost:5433/oleg_crm"
    YANDEX_API_KEY: str = ""
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "CRM Олега"
    REMINDER_EMAIL: str = ""

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
