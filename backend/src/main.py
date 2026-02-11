from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import os

# Определяем путь относительно текущего файла (main.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # Поднимаемся на уровень выше (в src/)
frontend_path = os.path.join(project_root, "..", "frontend")  # Путь к frontend/

app = FastAPI(
    title="CRM Олега",
    version="0.1.0",
    description="Система учета заказов и мастеров"
)

# Подключение статических файлов (CSS/JS/изображения)
app.mount(
    "/static",
    StaticFiles(directory=frontend_path),
    name="static"
)

# Настройка шаблонизатора
templates = Jinja2Templates(directory=frontend_path)

@app.get("/new_orders", response_class=HTMLResponse)
async def read_index(request: Request):
    try:
        return templates.TemplateResponse("new_order.html", {"request": request})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка шаблона: {str(e)}")

# Дополнительный маршрут для проверки
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
