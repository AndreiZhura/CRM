from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import jwt # PyJWT
from passlib.context import CryptContext
import datetime

app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "твой_секретный_ключ_для_мака"

# В реальной базе это будут ты и Олег
FAKE_USERS_DB = {
    "andrey@mail.ru": {
        "username": "Andrey",
        "hashed_password": pwd_context.hash("твой_пароль")
    },
    "oleg@mail.ru": {
        "username": "Oleg",
        "hashed_password": pwd_context.hash("пароль_олега")
    }
}

@app.post("/login")
async def login(data: dict):
    email = data.get("email")
    password = data.get("password")
    
    user = FAKE_USERS_DB.get(email)
    if not user or not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Неверные данные")

    # Создаем токен на 24 часа
    token = jwt.encode({
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return {"access_token": token, "token_type": "bearer"}