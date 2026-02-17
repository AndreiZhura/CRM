from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from tensorflow.keras.models import load_model
import joblib
import os
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Флаги доступности модели и препроцессора
model_available = False
scaler_available = False

# Глобальные переменные для модели и скалера
model = None
scaler = None

# Функция загрузки модели и препроцессора
def load_components():
    global model, scaler, model_available, scaler_available
    
    try:
        model_path = "ml_service/models/demand_model.h5"
        scaler_path = "models/scaler.pkl"
        
        if os.path.exists(model_path):
            logger.info("Загрузка модели...")
            model = load_model(model_path)
            model_available = True
        else:
            logger.warning("Модель не найдена")
            model_available = False
            
        if os.path.exists(scaler_path):
            logger.info("Загрузка скалера...")
            scaler = joblib.load(scaler_path)
            scaler_available = True
        else:
            logger.warning("Скалер не найден")
            scaler_available = False
            
    except Exception as e:
        logger.error(f"Ошибка при загрузке компонентов: {str(e)}")
        model_available = False
        scaler_available = False

# Загружаем компоненты при старте
load_components()

class Features(BaseModel):
    day_of_week: int
    month: int
    temperature: float
    precipitation: float
    # ... другие признаки

@app.post("/predict")
def predict(features: Features):
    if not model_available:
        raise HTTPException(status_code=400, detail="Модель прогнозирования недоступна")
    
    if not scaler_available:
        raise HTTPException(status_code=400, detail="Препроцессор масштабирования недоступен")
    
    try:
        # Проверка типов данных
        if not isinstance(features.day_of_week, int):
            raise ValueError("day_of_week должен быть целым числом")
        if not isinstance(features.month, int):
            raise ValueError("month должен быть целым числом")
        if not isinstance(features.temperature, float):
            raise ValueError("temperature должен быть числом с плавающей точкой")
        if not isinstance(features.precipitation, float):
            raise ValueError("precipitation должен быть числом с плавающей точкой")
        
        # Преобразуем в массив и масштабируем
        X = np.array([[features.day_of_week, features.month, features.temperature, features.precipitation]])
        X_scaled = scaler.transform(X)
        pred = model.predict(X_scaled)
        return {"demand": float(pred[0][0])}
    
    except Exception as e:
        logger.error(f"Ошибка при предсказании: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка при обработке запроса")

@app.get("/health")
def health_check():
    return {
        "model_available": model_available,
        "scaler_available": scaler_available
    }

@app.get("/check-paths")
def check_paths():
    return {
        "ml_service_models_exists": os.path.exists("ml_service/models"),
        "models_exists": os.path.exists("models"),
        "current_working_directory": os.getcwd()
    }
