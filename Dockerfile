FROM python:3.11-slim

WORKDIR /app

# Копируем и устанавливаем зависимости (кэшируем)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем всю структуру проекта
COPY backend ./backend
COPY database ./database

# Устанавливаем права доступа (если нужно)
RUN chmod -R 755 ./backend

# Проверяем наличие необходимых файлов
RUN ls -la ./backend/src/core
RUN ls -la ./backend/src/models

# Запускаем сервер с правильным путем к приложению
CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
