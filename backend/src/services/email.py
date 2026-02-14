from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from core.config import settings
from typing import List

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_reminder_email(recipient: str, orders_html: str):
    """
    Отправляет письмо с напоминанием о зависших заказах.
    orders_html – HTML-таблица со списком заказов.
    """
    message = MessageSchema(
        subject="Напоминание о зависших заказах",
        recipients=[recipient],
        body=orders_html,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)