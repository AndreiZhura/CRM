import aiohttp
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.weather import Weather
from src.core.db import AsyncSessionLocal
from src.models.address_cache import AddressCache

logger = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1/forecast"

async def fetch_weather_data(
    lat: float,
    lon: float,
    start_date: date,
    end_date: date
) -> Optional[Dict[str, Any]]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
        "timezone": "auto",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(BASE_URL, params=params) as resp:
                if resp.status != 200:
                    logger.error(f"Open-Meteo error: {resp.status}")
                    return None
                data = await resp.json()
                return data
    except Exception as e:
        logger.exception(f"Failed to fetch weather: {e}")
        return None

async def save_weather_data(db: AsyncSession, location: str, lat: float, lon: float, data: dict):
    times = data.get("daily", {}).get("time", [])
    max_temps = data.get("daily", {}).get("temperature_2m_max", [])
    min_temps = data.get("daily", {}).get("temperature_2m_min", [])
    precipt = data.get("daily", {}).get("precipitation_sum", [])
    codes = data.get("daily", {}).get("weathercode", [])

    for i, day_str in enumerate(times):
        day = date.fromisoformat(day_str)
        # Проверяем, есть ли уже запись
        stmt = select(Weather).where(
            Weather.date == day,
            Weather.location == location
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            # Можно обновить или пропустить
            continue
        weather = Weather(
            date=day,
            location=location,
            lat=lat,
            lon=lon,
            temperature_max=max_temps[i] if i < len(max_temps) else None,
            temperature_min=min_temps[i] if i < len(min_temps) else None,
            precipitation=precipt[i] if i < len(precipt) else None,
            weather_condition=str(codes[i]) if i < len(codes) else None,
            source="open-meteo"
        )
        db.add(weather)
    await db.commit()



async def daily_weather_collection():
    """
    Фоновая задача: собирает погоду для всех уникальных адресов из кэша.
    """
    async with AsyncSessionLocal() as db:
        # Получаем все уникальные адреса с координатами
        result = await db.execute(
            select(AddressCache.address, AddressCache.lat, AddressCache.lon).distinct()
        )
        locations = result.all()
        today = date.today()
        start_date = today - timedelta(days=1)   # вчера
        end_date = today + timedelta(days=7)     # прогноз на 7 дней

        for loc in locations:
            if loc.lat is None or loc.lon is None:
                continue
            data = await fetch_weather_data(loc.lat, loc.lon, start_date, end_date)
            if data:
                await save_weather_data(db, loc.address, loc.lat, loc.lon, data)
        logger.info("Daily weather collection completed")