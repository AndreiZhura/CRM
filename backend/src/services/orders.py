from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models.orders import Order
from schemas.orders import OrderCreate, OrderUpdate

async def create_order(db: AsyncSession, order_data: OrderCreate):
    order = Order(**order_data.model_dump())
    db.add(order)
    await db.commit()
    await db.refresh(order)
    # Чтобы вернуть связанные объекты, нужно их подгрузить
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
    if order:
        update_data = order_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
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