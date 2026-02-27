# backend/src/services/order_expenses.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from src.models.order_expense import OrderExpense
from src.schemas.order_expense import OrderExpenseCreate, OrderExpenseUpdate

async def create_order_expense(db: AsyncSession, expense_data: OrderExpenseCreate) -> OrderExpense:
    expense = OrderExpense(**expense_data.model_dump())
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense

async def get_order_expense(db: AsyncSession, expense_id: int) -> Optional[OrderExpense]:
    result = await db.execute(
        select(OrderExpense).where(OrderExpense.id == expense_id)
    )
    return result.scalar_one_or_none()

async def get_order_expenses_by_order(db: AsyncSession, order_id: int) -> List[OrderExpense]:
    result = await db.execute(
        select(OrderExpense).where(OrderExpense.order_id == order_id)
    )
    return result.scalars().all()

async def update_order_expense(db: AsyncSession, expense_id: int, expense_data: OrderExpenseUpdate) -> Optional[OrderExpense]:
    expense = await get_order_expense(db, expense_id)
    if not expense:
        return None
    update_data = expense_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
    await db.commit()
    await db.refresh(expense)
    return expense

async def delete_order_expense(db: AsyncSession, expense_id: int) -> bool:
    expense = await get_order_expense(db, expense_id)
    if not expense:
        return False
    await db.delete(expense)
    await db.commit()
    return True
