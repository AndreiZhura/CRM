from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models.orders import Order
from schemas.orders import OrderCreate, OrderUpdate
from services.geocoding import get_coordinates
from services.address_cache import get_or_create_address_cache

async def create_order(db: AsyncSession, order_data: OrderCreate):
    # Сначала создаём заказ без address_id
    order_dict = order_data.model_dump()
    address_text = order_dict.pop('address_text', None)
    
    order = Order(**order_dict)
    db.add(order)
    await db.flush()  # чтобы получить id заказа, но не коммитить
    
    # Если есть адрес, пытаемся получить координаты
    if address_text:
        coords = await get_coordinates(address_text)
        if coords:
            lat, lon = coords
            # Сохраняем в кэш и получаем запись
            cache_entry = await get_or_create_address_cache(db, address_text, lat, lon)
            order.address_id = cache_entry.address
            order.address_text = address_text  # сохраняем исходный адрес
        else:
            # если координаты не получены, сохраняем только текст
            order.address_text = address_text
    else:
        order.address_text = None

    await db.commit()
    await db.refresh(order)
    # Подгружаем связи
    result = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.client), selectinload(Order.installer))
    )
    return result.scalar_one()

async def get_order(db: AsyncSession, order_id: int):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.client), selectinload(Order.installer))
    )
    return result.scalar_one_or_none()

async def get_orders(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Order)
        .offset(skip)
        .limit(limit)
        .options(selectinload(Order.client), selectinload(Order.installer))
    )
    return result.scalars().all()

async def update_order(db: AsyncSession, order_id: int, order_data: OrderUpdate):
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
            # Если координаты не получены, очищаем address_id и сохраняем текст
            order.address_id = None
            order.address_text = address_text
    # Применяем остальные обновления
    for key, value in update_data.items():
        if key != 'address_text':
            setattr(order, key, value)

    await db.commit()
    await db.refresh(order)
    return order

async def delete_order(db: AsyncSession, order_id: int):
    order = await get_order(db, order_id)
    if order:
        await db.delete(order)
        await db.commit()
    return order