# backend/src/routers/payments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.auth import get_current_admin
from src.schemas.payment import PaymentCreate, PaymentUpdate, Payment
from src.services.payments import (
    create_payment,
    get_payment,
    get_payments_by_order,
    update_payment,
    delete_payment,
)

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/", response_model=Payment, status_code=status.HTTP_201_CREATED)
async def create_payment_endpoint(
    payment: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Записать платёж (от клиента или монтажнику)."""
    return await create_payment(db, payment)

@router.get("/order/{order_id}", response_model=List[Payment])
async def read_payments_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить все платежи по заказу."""
    payments = await get_payments_by_order(db, order_id)
    return payments

@router.get("/{payment_id}", response_model=Payment)
async def read_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить конкретный платёж."""
    payment = await get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.put("/{payment_id}", response_model=Payment)
async def update_payment_endpoint(
    payment_id: int,
    payment: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Обновить платёж."""
    updated = await update_payment(db, payment_id, payment)
    if not updated:
        raise HTTPException(status_code=404, detail="Payment not found")
    return updated

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_endpoint(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Удалить платёж."""
    deleted = await delete_payment(db, payment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Payment not found")
    return None