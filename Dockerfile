FROM python:3.11-slim

WORKDIR /app

# Копируем requirements.txt из папки backend/
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект
COPY . .

CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
