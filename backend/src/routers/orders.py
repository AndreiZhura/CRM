from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_db
from src.services.orders import (
    create_order, get_order, get_orders,
    update_order, delete_order
)
from src.schemas.orders import OrderCreate, OrderUpdate, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    order: OrderCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_order(db, order)

@router.get("/", response_model=list[OrderOut])
async def read_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await get_orders(db, skip, limit)

@router.get("/{order_id}", response_model=OrderOut)
async def read_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    order = await get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/{order_id}", response_model=OrderOut)
async def update_order_endpoint(
    order_id: int,
    order: OrderUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await update_order(db, order_id, order)
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_endpoint(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    deleted = await delete_order(db, order_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Order not found")
    return None