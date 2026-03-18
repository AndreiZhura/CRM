from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_db
from src.core.scheduler import start_scheduler, scheduler
from src.core.logging import logger, LoggingMiddleware
from src.routers import (
    auth, clients, installers, orders, finance, reminders,
    debug, order_items, order_installers, order_expenses,
    warranty_claims, payments
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CRM application")
    start_scheduler()
    logger.info("Scheduler started")
    yield
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(title="СRM Олега", lifespan=lifespan)

# Middleware (до роутеров)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

# Роутеры
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(installers.router)
app.include_router(orders.router)
app.include_router(finance.router)
app.include_router(reminders.router)
app.include_router(order_items.router)
app.include_router(order_installers.router)
app.include_router(order_expenses.router)
app.include_router(warranty_claims.router)
app.include_router(payments.router)
app.include_router(debug.router)


@app.get("/")
async def root():
    return {"message": "CRM is running"}


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
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