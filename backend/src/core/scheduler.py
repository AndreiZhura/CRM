from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from src.core.config import settings
from src.services.reminder_service import send_daily_reminder  # создадим этот сервис
from src.services.weather_service import daily_weather_collection
from src.services.training_service import run_training

scheduler = AsyncIOScheduler()


def start_scheduler():
    # Задача для напоминаний в 9:00
    scheduler.add_job(
        send_daily_reminder,
        CronTrigger(hour=9, minute=0),
        id="daily_reminder",
        replace_existing=True,
        args=[settings.REMINDER_EMAIL]
    )
    # Задача для сбора погоды в 1:00
    scheduler.add_job(
        daily_weather_collection,
        CronTrigger(hour=1, minute=0),
        id="daily_weather",
        replace_existing=True
    )
    scheduler.add_job(
        run_training,
        # каждое воскресенье в 3:00
        CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="weekly_training",
        replace_existing=True
    )

    scheduler.start()

from src.services.backup_service import daily_backup_and_report

def start_scheduler():
    # ... существующие задачи
    scheduler.add_job(
        daily_backup_and_report,
        CronTrigger(hour=2, minute=0),
        id="daily_backup_report",
        replace_existing=True,
        args=[settings.REMINDER_EMAIL]  # на тот же email, что и напоминания
    )
    scheduler.add_job(
    daily_backup_and_report,
    CronTrigger(hour=2, minute=0),  # каждый день в 2:00
    id="daily_backup_report",
    replace_existing=True,
    args=[settings.REMINDER_EMAIL]
)
    scheduler.start()