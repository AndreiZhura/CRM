import asyncio
import subprocess
import logging
import tempfile
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import pandas as pd
from sqlalchemy import text
from src.core.db import AsyncSessionLocal
from src.core.config import settings
import yadisk

logger = logging.getLogger(__name__)

# ---------- Базовая директория для локальных бэкапов ----------
BACKUP_DIR = Path("backups")
BACKUP_DIR.mkdir(exist_ok=True)

# ---------- Вспомогательная функция для получения параметров БД ----------
def get_db_params():
    """Извлекает параметры подключения к БД из DATABASE_URL."""
    url = urlparse(settings.DATABASE_URL)
    return {
        "host": url.hostname or "localhost",
        "port": url.port or 5432,
        "user": url.username or "admin",
        "dbname": url.path.lstrip('/'),
        "password": settings.POSTGRES_PASSWORD,
    }

# ---------- Создание дампа БД ----------
def create_db_dump(local_dir: Path) -> Path:
    """
    Создаёт дамп базы данных с помощью pg_dump в указанной локальной папке.
    Возвращает путь к созданному файлу.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = local_dir / f"db_backup_{timestamp}.sql"

    params = get_db_params()
    cmd = [
        "pg_dump",
        "-h", params["host"],
        "-p", str(params["port"]),
        "-U", params["user"],
        "-d", params["dbname"],
        "-f", str(filename)
    ]
    env = {"PGPASSWORD": params["password"]}

    try:
        subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
        logger.info(f"DB dump created: {filename}")
        return filename
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to create dump: {e.stderr}")
        raise

# ---------- Генерация Excel-отчёта ----------
async def generate_excel_report(local_dir: Path) -> Path:
    """
    Генерирует Excel-отчёт со сводкой заказов в указанной локальной папке.
    Возвращает путь к созданному файлу.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = local_dir / f"report_{timestamp}.xlsx"

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

    # --- ЖЁСТКО ЗАДАЁМ ПОРЯДОК КОЛОНОК ---
    desired_order = [
        'order_id',
        'created_at',
        'status',
        'address_text',
        'client_name',
        'installers',
        'revenue',
        'cost_of_goods',
        'installer_payments',
        'expenses',
        'profit',
        'temperature_avg',
        'precipitation'
    ]

    # Создаём DataFrame сразу с нужными колонками в правильном порядке
    df = pd.DataFrame(rows, columns=desired_order)

    # Переименовываем колонки на русские
    rename_map = {
        'order_id': 'ID заказа',
        'created_at': 'Дата создания',
        'status': 'Статус',
        'address_text': 'Адрес',
        'client_name': 'Клиент',
        'installers': 'Монтажники',
        'revenue': 'Выручка',
        'cost_of_goods': 'Себестоимость',
        'installer_payments': 'Выплаты монтажникам',
        'expenses': 'Расходы',
        'profit': 'Прибыль',
        'temperature_avg': 'Температура',
        'precipitation': 'Осадки'
    }
    df.rename(columns=rename_map, inplace=True)

    # --- ФОРМАТИРОВАНИЕ (без изменений) ---
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

async def upload_to_disk(local_path: Path, remote_dir: str) -> bool:
    """
    Загружает файл на Яндекс.Диск в указанную удалённую папку.
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
    Ежедневная задача: создаёт дамп и отчёт в подпапке с датой,
    загружает на Яндекс.Диск в аналогичную подпапку,
    отправляет письмо (опционально).
    """
    today_str = datetime.now().strftime('%Y-%m-%d')
    local_date_dir = BACKUP_DIR / today_str
    local_date_dir.mkdir(exist_ok=True)

    remote_date_dir = f"{settings.YANDEX_DISK_PATH}/{today_str}"

    dump_path = None
    report_path = None
    try:
        dump_path = await asyncio.to_thread(create_db_dump, local_date_dir)
        report_path = await generate_excel_report(local_date_dir)

        dump_ok = await upload_to_disk(dump_path, remote_date_dir)
        report_ok = await upload_to_disk(report_path, remote_date_dir)

        if dump_ok and report_ok:
            logger.info("Both files uploaded successfully")
        else:
            logger.warning("Some files failed to upload")

        logger.info(f"Daily backup and report completed for {today_str}")

    except Exception as e:
        logger.exception(f"Backup/report failed: {e}")