import logging
import logging.handlers
import os
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
import logging




LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

log_file = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y-%m-%d')}.log")

# Формат логов
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Обработчик для файла с ротацией по дням
file_handler = logging.handlers.TimedRotatingFileHandler(
    log_file, when='midnight', backupCount=30
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)

# Обработчик для консоли (ошибки и выше)
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.WARNING)

# Корневой логгер
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Логгер для SQLAlchemy (будет показывать выполняемые SQL)
sqlalchemy_logger = logging.getLogger('sqlalchemy.engine')
sqlalchemy_logger.setLevel(logging.WARNING)  # можно поставить INFO для отладки

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.exception(f"Unhandled exception: {e}")
            raise