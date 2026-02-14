from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from core.db import get_db
from models.orders import Order
from schemas.orders import OrderOut
from typing import List
from services.email import send_reminder_email
from fastapi import HTTPException

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("/stale-orders", response_model=List[OrderOut])
async def get_stale_orders(
    days: int = Query(7, description="Количество дней без обновления"),
    db: AsyncSession = Depends(get_db)
):
    """
    Возвращает заказы, которые не обновлялись более указанного количества дней
    и при этом не находятся в финальных статусах (Выполнен, Отменен).
    """
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
    days: int = Query(7, description="Количество дней без обновления"),
    db: AsyncSession = Depends(get_db)
):
    """
    Отправляет письмо со списком зависших заказов на указанный email.
    """
    # Получаем зависшие заказы
    cutoff_date = datetime.now() - timedelta(days=days)
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.updated_at < cutoff_date,
                Order.status.not_in(["Выполнен", "Отменен"])
            )
        )
        .options(selectinload(Order.client), selectinload(Order.installer))
        .order_by(Order.updated_at)
    )
    orders = result.scalars().all()
    
    if not orders:
        return {"message": "Нет зависших заказов"}
    
    # Формируем HTML-таблицу
    rows = ""
    for order in orders:
        rows += f"""
        <tr>
            <td>{order.id}</td>
            <td>{order.client.full_name if order.client else 'Н/Д'}</td>
            <td>{order.service_type}</td>
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
            <th>Тип услуги</th>
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
