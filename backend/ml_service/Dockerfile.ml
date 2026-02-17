FROM python:3.12-slim

WORKDIR /app

# Копируем зависимости и устанавливаем
COPY ml_service/requirements_ml.txt .
RUN pip install --no-cache-dir -r requirements_ml.txt

# Копируем код
COPY ml_service /app

# Запускаем сервер
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]