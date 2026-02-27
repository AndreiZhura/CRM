# backend/src/services/order_items.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from src.models.order_item import OrderItem
from src.schemas.order_item import OrderItemCreate, OrderItemUpdate

async def create_order_item(db: AsyncSession, item_data: OrderItemCreate) -> OrderItem:
    """Создать новую позицию."""
    item = OrderItem(**item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

async def get_order_item(db: AsyncSession, item_id: int) -> Optional[OrderItem]:
    """Получить позицию по ID."""
    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id)
    )
    return result.scalar_one_or_none()

async def get_order_items_by_order(db: AsyncSession, order_id: int) -> List[OrderItem]:
    """Получить все позиции заказа."""
    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.sort_order)
    )
    return result.scalars().all()

async def update_order_item(db: AsyncSession, item_id: int, item_data: OrderItemUpdate) -> Optional[OrderItem]:
    """Обновить позицию."""
    item = await get_order_item(db, item_id)
    if not item:
        return None
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item

async def delete_order_item(db: AsyncSession, item_id: int) -> bool:
    """Удалить позицию."""
    item = await get_order_item(db, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True