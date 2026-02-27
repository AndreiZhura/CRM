# backend/src/services/payments.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from src.models.payment import Payment
from src.schemas.payment import PaymentCreate, PaymentUpdate

async def create_payment(db: AsyncSession, payment_data: PaymentCreate) -> Payment:
    payment = Payment(**payment_data.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment

async def get_payment(db: AsyncSession, payment_id: int) -> Optional[Payment]:
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    return result.scalar_one_or_none()

async def get_payments_by_order(db: AsyncSession, order_id: int) -> List[Payment]:
    result = await db.execute(
        select(Payment).where(Payment.order_id == order_id)
    )
    return result.scalars().all()

async def update_payment(db: AsyncSession, payment_id: int, payment_data: PaymentUpdate) -> Optional[Payment]:
    payment = await get_payment(db, payment_id)
    if not payment:
        return None
    update_data = payment_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)
    await db.commit()
    await db.refresh(payment)
    return payment

async def delete_payment(db: AsyncSession, payment_id: int) -> bool:
    payment = await get_payment(db, payment_id)
    if not payment:
        return False
    await db.delete(payment)
    await db.commit()
    return True