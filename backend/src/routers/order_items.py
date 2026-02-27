# backend/src/routers/order_items.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.auth import get_current_admin
from src.schemas.order_item import OrderItemCreate, OrderItemUpdate, OrderItem
from src.services.order_items import (
    create_order_item,
    get_order_item,
    get_order_items_by_order,
    update_order_item,
    delete_order_item,
)

router = APIRouter(prefix="/order-items", tags=["Order Items"])

@router.post("/", response_model=OrderItem, status_code=status.HTTP_201_CREATED)
async def create_order_item_endpoint(
    item: OrderItemCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Создать новую позицию в заказе."""
    return await create_order_item(db, item)

@router.get("/order/{order_id}", response_model=List[OrderItem])
async def read_order_items_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить все позиции конкретного заказа."""
    items = await get_order_items_by_order(db, order_id)
    return items

@router.get("/{item_id}", response_model=OrderItem)
async def read_order_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить одну позицию по ID."""
    item = await get_order_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    return item

@router.put("/{item_id}", response_model=OrderItem)
async def update_order_item_endpoint(
    item_id: int,
    item: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Обновить позицию."""
    updated = await update_order_item(db, item_id, item)
    if not updated:
        raise HTTPException(status_code=404, detail="Order item not found")
    return updated

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_item_endpoint(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Удалить позицию."""
    deleted = await delete_order_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Order item not found")
    return None