from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from src.core.db import get_db
from src.models.orders import Order
from src.schemas.orders import OrderOut
from typing import List
from src.services.email import send_reminder_email
from sqlalchemy.orm import selectinload
from src.auth import get_current_admin
from src.models.admins import Admin

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("/stale-orders", response_model=List[OrderOut])
async def get_stale_orders(
    days: int = Query(7, description="Количество дней без обновления"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    cutoff_date = datetime.now() - timedelta(days=days)
    
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.updated_at < cutoff_date,
                Order.status.not_in(["Выполнен", "Отменен"])
            )
        )
        .order_by(Order.updated_at)
    )
    orders = result.scalars().all()
    return orders

@router.post("/send-email", status_code=200)
async def send_reminder_email_endpoint(
    recipient: str = Query(..., description="Email получателя"),
    days: int = Query(3, description="Количество дней без обновления"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    cutoff_date = datetime.now() - timedelta(days=days)
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.updated_at < cutoff_date,
                Order.status.not_in(["Выполнен", "Отменен"])
            )
        )
        .options(selectinload(Order.client), selectinload(Order.installers))
        .order_by(Order.updated_at)
    )
    orders = result.scalars().all()
    
    if not orders:
        return {"message": "Нет зависших заказов"}
    
    rows = ""
    for order in orders:
        client_name = order.client.full_name if order.client else 'Н/Д'
        rows += f"""
        <tr>
            <td>{order.id}</td>
            <td>{client_name}</td>
            <td>{order.status}</td>
            <td>{order.updated_at.strftime('%Y-%m-%d %H:%M')}</td>
        </tr>
        """
    html = f"""
    <h2>Зависшие заказы (более {days} дней без обновления)</h2>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
            <th>ID</th>
            <th>Клиент</th>
            <th>Статус</th>
            <th>Последнее обновление</th>
        </tr>
        {rows}
    </table>
    """
    
    try:
        await send_reminder_email(recipient, html)
        return {"message": f"Письмо отправлено на {recipient}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка отправки: {str(e)}")