from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Определяем корень проекта (папка, содержащая backend)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
PROJECT_ROOT = BASE_DIR.parent  # корень CRM
ENV_FILE = PROJECT_ROOT / '.env'

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
    YANDEX_DISK_TOKEN: str = ""
    YANDEX_DISK_PATH: str = "/CRM/backups"
    POSTGRES_PASSWORD: str = ""
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

settings = Settings()

