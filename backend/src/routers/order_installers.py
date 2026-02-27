# backend/src/routers/order_installers.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.auth import get_current_admin
from src.schemas.order_installer import OrderInstallerCreate, OrderInstallerUpdate, OrderInstaller
from src.services.order_installers import (
    create_order_installer,
    get_order_installer,
    get_order_installers_by_order,
    update_order_installer,
    delete_order_installer,
)

router = APIRouter(prefix="/order-installers", tags=["Order Installers"])

@router.post("/", response_model=OrderInstaller, status_code=status.HTTP_201_CREATED)
async def create_order_installer_endpoint(
    item: OrderInstallerCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Назначить монтажника на заказ."""
    return await create_order_installer(db, item)

@router.get("/order/{order_id}", response_model=List[OrderInstaller])
async def read_order_installers_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить всех монтажников, назначенных на заказ."""
    installers = await get_order_installers_by_order(db, order_id)
    return installers

@router.get("/{installer_id}", response_model=OrderInstaller)
async def read_order_installer(
    installer_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить конкретную запись о назначении."""
    item = await get_order_installer(db, installer_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order installer not found")
    return item

@router.put("/{installer_id}", response_model=OrderInstaller)
async def update_order_installer_endpoint(
    installer_id: int,
    item: OrderInstallerUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Обновить запись (например, изменить роль или оплату)."""
    updated = await update_order_installer(db, installer_id, item)
    if not updated:
        raise HTTPException(status_code=404, detail="Order installer not found")
    return updated

@router.delete("/{installer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_installer_endpoint(
    installer_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Снять монтажника с заказа."""
    deleted = await delete_order_installer(db, installer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Order installer not found")
    return None