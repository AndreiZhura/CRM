#create_async_engine — создаёт асинхронный движок.
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# AsyncSession — тип сессии.
#sessionmaker — фабрика сессий.
#declarative_base — для будущих моделей.
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings


ASYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(ASYNC_DATABASE_URL, echo = True)
AsyncSessionLocal = sessionmaker(
    engine, class_ = AsyncSession,expire_on_commit = False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session