FROM python:3.11-slim

WORKDIR /app

# Копируем и устанавливаем зависимости (кэшируем)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем ТОЛЬКО бэкенд и папку с инициализацией БД
COPY backend/src ./backend/src
COPY database ./database

# Запускаем сервер
CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"]