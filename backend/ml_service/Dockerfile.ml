# Dockerfile.ml
FROM python:3.11-slim

WORKDIR /app

# Копируем requirements
COPY ml_service/requirements_ml.txt .
RUN pip install --no-cache-dir -r requirements_ml.txt

# Копируем код сервиса
COPY ml_service ./ml_service

# Создаем директории для моделей
RUN mkdir -p ml_service/models
RUN mkdir -p models

# Устанавливаем права доступа
RUN chmod -R 755 ml_service

CMD ["uvicorn", "ml_service.app:app", "--host", "0.0.0.0", "--port", "8001"]
