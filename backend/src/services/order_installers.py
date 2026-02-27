# backend/src/services/order_installers.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from src.models.order_installer import OrderInstaller
from src.schemas.order_installer import OrderInstallerCreate, OrderInstallerUpdate

async def create_order_installer(db: AsyncSession, item_data: OrderInstallerCreate) -> OrderInstaller:
    """Назначить монтажника на заказ."""
    item = OrderInstaller(**item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

async def get_order_installer(db: AsyncSession, item_id: int) -> Optional[OrderInstaller]:
    result = await db.execute(
        select(OrderInstaller).where(OrderInstaller.id == item_id)
    )
    return result.scalar_one_or_none()

async def get_order_installers_by_order(db: AsyncSession, order_id: int) -> List[OrderInstaller]:
    result = await db.execute(
        select(OrderInstaller).where(OrderInstaller.order_id == order_id)
    )
    return result.scalars().all()

async def update_order_installer(db: AsyncSession, item_id: int, item_data: OrderInstallerUpdate) -> Optional[OrderInstaller]:
    item = await get_order_installer(db, item_id)
    if not item:
        return None
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item

async def delete_order_installer(db: AsyncSession, item_id: int) -> bool:
    item = await get_order_installer(db, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True