from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from tensorflow.keras.models import load_model
import joblib

app = FastAPI()

# Загружаем модель и препроцессор при старте
model = load_model("models/demand_model.h5")
scaler = joblib.load("models/scaler.pkl")

class Features(BaseModel):
    day_of_week: int
    month: int
    temperature: float
    precipitation: float
    # ... другие признаки

@app.post("/predict")
def predict(features: Features):
    # Преобразуем в массив и масштабируем
    X = np.array([[features.day_of_week, features.month, features.temperature, features.precipitation]])
    X_scaled = scaler.transform(X)
    pred = model.predict(X_scaled)
    return {"demand": float(pred[0][0])}