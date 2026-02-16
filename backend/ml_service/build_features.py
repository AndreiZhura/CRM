import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'src'))

import asyncio
import pandas as pd
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models.orders import Order
from models.finance import Finance
from models.weather import Weather
from models.address_cache import AddressCache
from models.installers import Installer

async def build_dataset():
    engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # SQL-запрос с объединением всех таблиц
        stmt = select(
            Order.id.label('order_id'),
            func.date(Order.created_at).label('date'),
            func.extract('year', Order.created_at).label('year'),
            func.extract('month', Order.created_at).label('month'),
            func.extract('day', Order.created_at).label('day'),
            func.extract('dow', Order.created_at).label('day_of_week'),
            Order.service_type,
            Order.status,
            AddressCache.lat,
            AddressCache.lon,
            Weather.temperature_avg,
            Weather.temperature_min,
            Weather.temperature_max,
            Weather.precipitation,
            Weather.weather_condition,
            Finance.sale_price_client,
            Finance.profit,
            Finance.payment_state,
            Installer.rating.label('installer_rating'),
            Installer.total_orders.label('installer_total_orders')
        ).join(
            Finance, Finance.order_id == Order.id, isouter=True
        ).join(
            AddressCache, AddressCache.address == Order.address_text, isouter=True
        ).join(
            Weather, (Weather.date == func.date(Order.created_at)) & (Weather.location == Order.address_text), isouter=True
        ).join(
            Installer, Installer.id == Order.installer_id, isouter=True
        ).where(
            Order.status.in_(["Выполнен", "Оплачен"])  # только релевантные заказы
        )

        result = await db.execute(stmt)
        rows = result.all()

    df = pd.DataFrame(rows, columns=result.keys())
    return df

if __name__ == '__main__':
    df = asyncio.run(build_dataset())
    print(f"Собрано {len(df)} строк")
    df.to_csv('dataset.csv', index=False)
    print("Датасет сохранён в dataset.csv")