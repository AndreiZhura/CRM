from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from core.config import settings
from services.reminder_service import send_daily_reminder  # создадим этот сервис
from services.weather_service import daily_weather_collection
from services.training_service import run_training

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
