import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'src'))

import asyncio
import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.models.orders import Order
from src.models.finance import Finance
from src.models.weather import Weather
from src.models.address_cache import AddressCache
from src.models.installers import Installer
from src.models.order_installer import OrderInstaller

async def build_dataset():
    engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        stmt = select(
            Order.id.label('order_id'),
            func.date(Order.created_at).label('date'),
            func.extract('year', Order.created_at).label('year'),
            func.extract('month', Order.created_at).label('month'),
            func.extract('day', Order.created_at).label('day'),
            func.extract('dow', Order.created_at).label('day_of_week'),
            Order.status,
            Order.address_text,
            AddressCache.lat,
            AddressCache.lon,
            Weather.temperature_avg,
            Weather.temperature_min,
            Weather.temperature_max,
            Weather.precipitation,
            Weather.weather_condition,
            Finance.revenue,
            Finance.profit,
            func.avg(Installer.rating).label('avg_installer_rating'),
            func.count(Installer.id).label('num_installers')
        ).join(
            Finance, Finance.order_id == Order.id, isouter=True
        ).join(
            AddressCache, AddressCache.address == Order.address_text, isouter=True
        ).join(
            Weather, (Weather.date == func.date(Order.created_at)) & (Weather.location == Order.address_text), isouter=True
        ).join(
            OrderInstaller, OrderInstaller.order_id == Order.id, isouter=True
        ).join(
            Installer, Installer.id == OrderInstaller.installer_id, isouter=True
        ).where(
            Order.status == "Выполнен"
        ).group_by(
            Order.id,
            Order.created_at,
            Order.status,
            Order.address_text,
            AddressCache.lat,
            AddressCache.lon,
            Weather.temperature_avg,
            Weather.temperature_min,
            Weather.temperature_max,
            Weather.precipitation,
            Weather.weather_condition,
            Finance.revenue,
            Finance.profit
        ).order_by(Order.id)

        result = await db.execute(stmt)
        rows = result.all()

    df = pd.DataFrame(rows, columns=result.keys())
    return df

if __name__ == '__main__':
    df = asyncio.run(build_dataset())
    print(f"Собрано {len(df)} строк")
    df.to_csv('dataset.csv', index=False)
    print("Датасет сохранён в dataset.csv")