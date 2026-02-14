from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.address_cache import AddressCache

async def get_address_cache(db: AsyncSession, address: str):
    result = await db.execute(
        select(AddressCache).where(AddressCache.address == address)
    )
    return result.scalar_one_or_none()

async def create_address_cache(db: AsyncSession, address: str, lat: float, lon: float):
    cache_entry = AddressCache(address=address, lat=lat, lon=lon)
    db.add(cache_entry)
    await db.commit()
    await db.refresh(cache_entry)
    return cache_entry

async def update_address_cache(db: AsyncSession, address: str, lat: float, lon: float):
    cache_entry = await get_address_cache(db, address)
    if cache_entry:
        cache_entry.lat = lat
        cache_entry.lon = lon
        await db.commit()
        await db.refresh(cache_entry)
    return cache_entry

async def get_or_create_address_cache(db: AsyncSession, address: str, lat: float, lon: float):
    """
    Получает запись из кэша по адресу, если нет — создаёт.
    Возвращает объект AddressCache.
    """
    cache_entry = await get_address_cache(db, address)
    if cache_entry:
        # при желании можно обновлять координаты, если они изменились
        if cache_entry.lat != lat or cache_entry.lon != lon:
            cache_entry.lat = lat
            cache_entry.lon = lon
            await db.commit()
            await db.refresh(cache_entry)
        return cache_entry
    else:
        return await create_address_cache(db, address, lat, lon)