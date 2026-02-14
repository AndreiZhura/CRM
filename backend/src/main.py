
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import get_db
from routers import clients ,installers,orders,finance  # в начало файла, после других импортов


app = FastAPI(title="СRM Олега")

app.include_router(clients.router)
app.include_router(installers.router)
app.include_router(orders.router)
app.include_router(finance.router)

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
async def health():
    return {"status":"ok"}


@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        return {"db_status": "connected", "result": result.scalar()}
    except Exception as e:
        return {"db_status": "error", "error": str(e)}