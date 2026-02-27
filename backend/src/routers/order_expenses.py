# backend/src/routers/order_expenses.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.auth import get_current_admin
from src.schemas.order_expense import OrderExpenseCreate, OrderExpenseUpdate, OrderExpense
from src.services.order_expenses import (
    create_order_expense,
    get_order_expense,
    get_order_expenses_by_order,
    update_order_expense,
    delete_order_expense,
)

router = APIRouter(prefix="/order-expenses", tags=["Order Expenses"])

@router.post("/", response_model=OrderExpense, status_code=status.HTTP_201_CREATED)
async def create_order_expense_endpoint(
    expense: OrderExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Добавить расход к заказу."""
    return await create_order_expense(db, expense)

@router.get("/order/{order_id}", response_model=List[OrderExpense])
async def read_order_expenses_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить все расходы заказа."""
    expenses = await get_order_expenses_by_order(db, order_id)
    return expenses

@router.get("/{expense_id}", response_model=OrderExpense)
async def read_order_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить конкретный расход."""
    expense = await get_order_expense(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Order expense not found")
    return expense

@router.put("/{expense_id}", response_model=OrderExpense)
async def update_order_expense_endpoint(
    expense_id: int,
    expense: OrderExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Обновить расход."""
    updated = await update_order_expense(db, expense_id, expense)
    if not updated:
        raise HTTPException(status_code=404, detail="Order expense not found")
    return updated

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_expense_endpoint(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Удалить расход."""
    deleted = await delete_order_expense(db, expense_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Order expense not found")
    return None