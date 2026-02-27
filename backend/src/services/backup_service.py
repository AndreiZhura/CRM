import asyncio
import subprocess
import logging
import shutil
from datetime import datetime
from pathlib import Path
import pandas as pd
from sqlalchemy import text
from src.core.db import AsyncSessionLocal
from src.core.config import settings
import yadisk

logger = logging.getLogger(__name__)

BACKUP_DIR = Path("backups")
BACKUP_DIR.mkdir(exist_ok=True)

def clean_old_backups():
    """Удаляет все старые файлы бэкапов из папки BACKUP_DIR."""
    for pattern in ["db_backup_*", "report_*"]:
        for f in BACKUP_DIR.glob(pattern):
            try:
                f.unlink()
                logger.debug(f"Removed old backup file: {f}")
            except Exception as e:
                logger.error(f"Failed to remove {f}: {e}")

def create_db_dump() -> Path:
    """
    Создаёт дамп базы данных с помощью pg_dump.
    Возвращает путь к созданному файлу.
    """
    timestamp = datetime.now().strftime("%Y.%m.%d_%H-%M")
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
    timestamp = datetime.now().strftime("%Y.%m.%d_%H-%M")
    filename = BACKUP_DIR / f"report_{timestamp}.xlsx"

    async with AsyncSessionLocal() as db:
        stmt = text("""
            SELECT
                o.id as order_id,
                o.created_at,
                o.status,
                o.address_text,
                c.full_name as client_name,
                (SELECT string_agg(i.full_name, ', ')
                 FROM order_installers oi
                 JOIN installers i ON oi.installer_id = i.id
                 WHERE oi.order_id = o.id) as installers,
                f.revenue,
                f.cost_of_goods,
                f.installer_payments,
                f.expenses,
                f.profit,
                w.temperature_avg,
                w.precipitation
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN finance f ON o.id = f.order_id
            LEFT JOIN weather w ON DATE(o.created_at) = w.date AND w.location = o.address_text
            ORDER BY o.created_at DESC
        """)
        result = await db.execute(stmt)
        rows = result.mappings().all()

    df = pd.DataFrame(rows)

    # Переименовываем колонки на русские
    df.columns = [
        'ID заказа', 'Дата создания', 'Статус', 'Адрес', 'Клиент',
        'Монтажники', 'Выручка', 'Себестоимость', 'Выплаты монтажникам',
        'Расходы', 'Прибыль', 'Температура', 'Осадки'
    ]

    # Форматирование чисел и дат
    with pd.ExcelWriter(filename, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Заказы')
        workbook = writer.book
        worksheet = writer.sheets['Заказы']

        money_format = workbook.add_format({'num_format': '#,##0.00'})
        int_format = workbook.add_format({'num_format': '0'})
        date_format = workbook.add_format({'num_format': 'dd.mm.yyyy hh:mm'})

        for col_num, col_name in enumerate(df.columns):
            if col_name in ['Выручка', 'Себестоимость', 'Выплаты монтажникам', 'Расходы', 'Прибыль']:
                worksheet.set_column(col_num, col_num, 15, money_format)
            elif col_name in ['Температура', 'Осадки']:
                worksheet.set_column(col_num, col_num, 10, int_format)
            elif col_name == 'Дата создания':
                worksheet.set_column(col_num, col_num, 18, date_format)
            else:
                worksheet.set_column(col_num, col_num, 20)

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

async def upload_to_disk(local_path: Path, remote_dir: str = "/CRM/backups") -> bool:
    """
    Загружает файл на Яндекс.Диск в указанную папку.
    Возвращает True при успехе, False при ошибке.
    """
    token = settings.YANDEX_DISK_TOKEN
    if not token:
        logger.error("YANDEX_DISK_TOKEN not set")
        return False

    remote_filename = local_path.name
    remote_path = f"{remote_dir}/{remote_filename}"

    try:
        async with yadisk.AsyncClient(token=token) as client:
            if not await client.check_token():
                logger.error("Yandex.Disk token invalid")
                return False

            await ensure_disk_folder(client, remote_dir)
            await client.upload(str(local_path), remote_path, overwrite=True)
            logger.info(f"File uploaded to Yandex.Disk: {remote_path}")
            return True
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return False

# ---------- Основная задача ----------
async def daily_backup_and_report(recipient: str):
    """
    Ежедневная задача: удаляет старые локальные бэкапы, создаёт новые дамп и отчёт,
    загружает их на Яндекс.Диск.
    """
    try:
        # Удаляем старые файлы перед созданием новых
        clean_old_backups()

        # Создаём локальные файлы
        dump_path = await asyncio.to_thread(create_db_dump)
        report_path = await generate_excel_report()

        # Загружаем на Яндекс.Диск
        dump_ok = await upload_to_disk(dump_path)
        report_ok = await upload_to_disk(report_path)

        if dump_ok and report_ok:
            logger.info("Both files uploaded successfully")
            # (опционально) можно отправить письмо
        else:
            logger.warning("Some files failed to upload")

        logger.info("Daily backup and report completed")

    except Exception as e:
        logger.exception(f"Backup/report failed: {e}")