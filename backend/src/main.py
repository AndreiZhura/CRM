from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
# Подключение роутеров
from routers.orders import router as orders_router
from routers.installers import router as installers_router



# --- КОНФИГУРАЦИЯ И ПОДКЛЮЧЕНИЕ ---
app = FastAPI(title="Олег-Холод ERP")

app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")


app.include_router(orders_router)
app.include_router(installers_router)

# --- СТРАНИЦЫ FRONTEND ---
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/journal", response_class=HTMLResponse)
async def read_journal(request: Request):
    return templates.TemplateResponse("journal.html", {"request": request})
