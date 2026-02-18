from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from src.models.orders import Order
from src.schemas.orders import OrderCreate, OrderUpdate
from src.services.geocoding import get_coordinates
from src.services.address_cache import get_or_create_address_cache

async def create_order(db: AsyncSession, order_data: OrderCreate):
    # Преобразуем данные в словарь
    order_dict = order_data.model_dump()
    
    # Убираем часовой пояс у datetime полей
    for field in ['service_datetime', 'delivery_datetime']:
        if order_dict.get(field) and hasattr(order_dict[field], 'tzinfo'):
            order_dict[field] = order_dict[field].replace(tzinfo=None)
    
    # Геокодинг адреса
    address_text = order_dict.get('address_text')
    if address_text:
        coords = await get_coordinates(address_text)
        if coords:
            lat, lon = coords
            cache_entry = await get_or_create_address_cache(db, address_text, lat, lon)
            order_dict['address_id'] = cache_entry.address
        else:
            order_dict['address_id'] = None
    else:
        order_dict['address_id'] = None

    order = Order(**order_dict)
    db.add(order)
    await db.flush()  # получаем id

    # Загружаем все связанные объекты для сериализации
    await db.refresh(order, attribute_names=['client', 'installer', 'finance'])
    await db.commit()
    return order

async def get_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.client), selectinload(Order.installer), selectinload(Order.finance))
    )
    return result.scalar_one_or_none()

async def get_orders(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Order]:
    result = await db.execute(
        select(Order)
        .offset(skip)
        .limit(limit)
        .options(selectinload(Order.client), selectinload(Order.installer), selectinload(Order.finance))
    )
    return result.scalars().all()

async def update_order(db: AsyncSession, order_id: int, order_data: OrderUpdate) -> Optional[Order]:
    order = await get_order(db, order_id)
    if not order:
        return None

    update_data = order_data.model_dump(exclude_unset=True)
    address_text = update_data.get('address_text')

    # Если адрес обновляется, обрабатываем геокодинг
    if address_text is not None:
        coords = await get_coordinates(address_text)
        if coords:
            lat, lon = coords
            cache_entry = await get_or_create_address_cache(db, address_text, lat, lon)
            order.address_id = cache_entry.address
            order.address_text = address_text
        else:
            order.address_id = None
            order.address_text = address_text

    # Применяем остальные обновления
    for key, value in update_data.items():
        if key != 'address_text':
            setattr(order, key, value)

    await db.commit()
    # Перезагружаем связи после коммита
    await db.refresh(order, attribute_names=['client', 'installer', 'finance'])
    return order

async def delete_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    order = await get_order(db, order_id)
    if order:
        await db.delete(order)
        await db.commit()
    return order