import sys
from pathlib import Path
import asyncio
import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Добавляем путь к папке src, чтобы импорты работали
src_path = Path(__file__).parent.parent / 'src'
sys.path.append(str(src_path))

# Теперь можно импортировать модели и конфиг
from models.finance import Finance
from models.weather import Weather
from models.orders import Order
from core.config import settings
from models.clients import Client   # добавь эту строку
from models.installers import Installer
from datetime import datetime
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_file = f"datasets/dataset_{timestamp}.csv"
async def main():
    # Подключаемся к БД
    engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Объединяем заказы с погодой по дате и городу (первая часть адреса)
        stmt = select(
            Order.id,
            Order.created_at,
            Order.service_type,
            Order.status,
            Weather.date,
            Weather.location,
            Weather.temperature_avg,
            Weather.temperature_min,
            Weather.temperature_max,
            Weather.precipitation,
            Weather.weather_condition
        ).join(
            Weather,
            (func.date(Order.created_at) == Weather.date) & 
            (Weather.location == Order.address_text)
        )
        result = await db.execute(stmt)
        rows = result.all()

    df = pd.DataFrame(rows, columns=[
        'order_id', 'created_at', 'service_type', 'status',
        'date', 'location', 'temp_avg', 'temp_min', 'temp_max',
        'precipitation', 'condition'
    ])
    df.to_csv('dataset.csv', index=False)
    print(f"Сохранено {len(df)} строк в dataset.csv")

if __name__ == '__main__':
    asyncio.run(main())