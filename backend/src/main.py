
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import get_db
from routers import clients ,installers,orders,finance  # в начало файла, после других импортов
from routers import reminders
from core.scheduler import start_scheduler
from core.logging import logger
from core.logging import LoggingMiddleware
from core.scheduler import scheduler
from routers import auth



app = FastAPI(title="СRM Олега")

app.include_router(clients.router)
app.include_router(installers.router)
app.include_router(orders.router)
app.include_router(finance.router)
app.include_router(reminders.router)
app.add_middleware(LoggingMiddleware)
app.include_router(auth.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting CRM application")
    start_scheduler()
    logger.info("Scheduler started")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # разрешаем все источники (для разработки)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CRM is running"}

@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """Проверка работоспособности."""
    health_data = {
        "status": "ok",
        "database": "unknown",
        "scheduler": "running" if scheduler.running else "stopped"
    }
    try:
        await db.execute(text("SELECT 1"))
        health_data["database"] = "ok"
    except Exception as e:
        health_data["database"] = f"error: {e}"
        health_data["status"] = "degraded"
    return health_data


@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        return {"db_status": "connected", "result": result.scalar()}
    except Exception as e:
        return {"db_status": "error", "error": str(e)}
    
