from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from models.orders import Order
from services.email import send_reminder_email
from core.db import AsyncSessionLocal
from sqlalchemy.orm import selectinload
import logging
logger = logging.getLogger(__name__)

async def send_daily_reminder(recipient: str):
     async with AsyncSessionLocal() as db:
        cutoff_date = datetime.now() - timedelta(days=7)
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.client), selectinload(Order.installer))
            .where(
                and_(
                    Order.updated_at < cutoff_date,
                    Order.status.not_in(["Выполнен", "Отменен"])
                )
            )
            .order_by(Order.updated_at)
        )
        orders = result.scalars().all()

        if not orders:
            return

        rows = ""
        for order in orders:
            client_name = order.client.full_name if order.client else "Н/Д"
            rows += f"""
            <tr>
                <td>{order.id}</td>
                <td>{client_name}</td>
                <td>{order.service_type}</td>
                <td>{order.status}</td>
                <td>{order.updated_at.strftime('%Y-%m-%d %H:%M')}</td>
            </tr>
            """
        html = f"""
        <h2>Зависшие заказы (более 7 дней без обновления)</h2>
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
        await send_reminder_email(recipient, html)