from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from src.core.config import settings
from src.services.reminder_service import send_daily_reminder
from src.services.weather_service import daily_weather_collection
from src.services.training_service import run_training
from src.services.backup_service import daily_backup_and_report

scheduler = AsyncIOScheduler()

def start_scheduler():
    # Напоминания в 9:00
    scheduler.add_job(
        send_daily_reminder,
        CronTrigger(hour=9, minute=0),
        id="daily_reminder",
        replace_existing=True,
        args=[settings.REMINDER_EMAIL]
    )
    # Сбор погоды в 1:00
    scheduler.add_job(
        daily_weather_collection,
        CronTrigger(hour=1, minute=0),
        id="daily_weather",
        replace_existing=True
    )
    # Обучение модели в воскресенье в 3:00
    scheduler.add_job(
        run_training,
        CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="weekly_training",
        replace_existing=True
    )
    # Бэкап в 2:00
    scheduler.add_job(
        daily_backup_and_report,
        CronTrigger(hour=2, minute=0),
        id="daily_backup_report",
        replace_existing=True,
        args=[settings.REMINDER_EMAIL]
    )

    scheduler.start()