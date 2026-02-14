from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from core.config import settings
from services.reminder_service import send_daily_reminder  # создадим этот сервис

scheduler = AsyncIOScheduler()

def start_scheduler():
    # Запускаем задачу каждый день в 9:00
    scheduler.add_job(
        send_daily_reminder,
        CronTrigger(hour=9, minute=0),
        id="daily_reminder",
        replace_existing=True,
        args=[settings.REMINDER_EMAIL]  # передаём email получателя
    )
    scheduler.start()