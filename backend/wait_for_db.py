import asyncio
import asyncpg
from src.core.config import settings
import sys

async def wait_for_db(max_retries=30, delay=2):
    """Пытается подключиться к БД до max_retries раз."""
    # Преобразуем URL для asyncpg
    dsn = settings.DATABASE_URL.replace('postgresql://', 'postgresql://')
    for i in range(max_retries):
        try:
            conn = await asyncpg.connect(dsn)
            await conn.close()
            print("✅ Database is ready!")
            return True
        except Exception as e:
            print(f"⏳ Waiting for database... ({i+1}/{max_retries}) Error: {e}")
            await asyncio.sleep(delay)
    print("❌ Could not connect to database after multiple retries.")
    sys.exit(1)

async def main():
    await wait_for_db()

if __name__ == "__main__":
    asyncio.run(main())