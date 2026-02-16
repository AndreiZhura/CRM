import asyncio
import subprocess
import logging
from datetime import datetime
from pathlib import Path
import pandas as pd
from sqlalchemy import text
from core.db import AsyncSessionLocal
from core.config import settings
import yadisk

logger = logging.getLogger(__name__)

BACKUP_DIR = Path("backups")
BACKUP_DIR.mkdir(exist_ok=True)

# ---------- Создание локальных файлов ----------
def create_db_dump() -> Path:
    """
    Создаёт дамп базы данных с помощью pg_dump.
    Возвращает путь к созданному файлу.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = BACKUP_DIR / f"db_backup_{timestamp}.sql"

    cmd = [
        "pg_dump",
        "-h", "localhost",
        "-p", "5433",
        "-U", "admin",
        "-d", "oleg_crm",
        "-f", str(filename)
    ]
    env = {"PGPASSWORD": settings.POSTGRES_PASSWORD}

    try:
        subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
        logger.info(f"DB dump created: {filename}")
        return filename
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to create dump: {e.stderr}")
        raise

async def generate_excel_report() -> Path:
    """
    Генерирует Excel-отчёт со сводкой заказов.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = BACKUP_DIR / f"report_{timestamp}.xlsx"

    async with AsyncSessionLocal() as db:
        stmt = text("""
            SELECT o.id as order_id,
                   o.created_at,
                   o.service_type,
                   o.status,
                   o.address_text,
                   c.full_name as client_name,
                   i.full_name as installer_name,
                   f.sale_price_client,
                   f.profit,
                   w.temperature_avg,
                   w.precipitation
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN installers i ON o.installer_id = i.id
            LEFT JOIN finance f ON o.id = f.order_id
            LEFT JOIN weather w ON DATE(o.created_at) = w.date AND w.location = o.address_text
            ORDER BY o.created_at DESC
        """)
        result = await db.execute(stmt)
        rows = result.mappings().all()

    df = pd.DataFrame(rows)
    df.to_excel(filename, index=False, engine='openpyxl')
    logger.info(f"Excel report created: {filename}")
    return filename

# ---------- Работа с Яндекс.Диском ----------
async def ensure_disk_folder(client: yadisk.AsyncClient, path: str):
    """Создаёт папку на Яндекс.Диске, если её нет."""
    parts = path.strip("/").split("/")
    current = ""
    for part in parts:
        current += "/" + part
        try:
            await client.mkdir(current)
        except yadisk.exceptions.PathExistsError:
            pass
        except Exception as e:
            logger.error(f"Failed to create folder {current}: {e}")
            raise

async def upload_to_disk(local_path: Path, remote_dir: str = "/CRM/backups"):
    """
    Загружает файл на Яндекс.Диск в указанную папку.
    """
    token = settings.YANDEX_DISK_TOKEN
    if not token:
        logger.error("YANDEX_DISK_TOKEN not set")
        return

    remote_filename = local_path.name
    remote_path = f"{remote_dir}/{remote_filename}"

    async with yadisk.AsyncClient(token=token) as client:
        # Проверяем токен
        if not await client.check_token():
            logger.error("Yandex.Disk token invalid")
            return

        # Создаём папку (если нужно)
        await ensure_disk_folder(client, remote_dir)

        # Загружаем файл
        await client.upload(str(local_path), remote_path, overwrite=True)
        logger.info(f"File uploaded to Yandex.Disk: {remote_path}")

# ---------- Основная задача ----------
async def daily_backup_and_report(recipient: str):
    """
    Ежедневная задача: создаёт дамп, отчёт, загружает на Яндекс.Диск и отправляет письмо.
    """
    try:
        # Создаём локальные файлы
        dump_path = await asyncio.to_thread(create_db_dump)  # выполняем в отдельном потоке
        report_path = await generate_excel_report()

        # Загружаем на Яндекс.Диск
        await upload_to_disk(dump_path)
        await upload_to_disk(report_path)

        # Отправляем письмо с отчётом (если нужна функция send_email_with_attachment)
        # await send_email_with_attachment(recipient, "Ежедневный отчёт CRM", "Во вложении отчёт за сегодня.", report_path)

        logger.info("Daily backup and report completed successfully")
    except Exception as e:
        logger.exception(f"Backup/report failed: {e}")