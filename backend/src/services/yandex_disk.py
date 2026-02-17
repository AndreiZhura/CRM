import yadisk
import logging
from pathlib import Path
from src.core.config import settings
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

disk_client = yadisk.AsyncClient(token=settings.YANDEX_DISK_TOKEN)

async def ensure_backup_folder():
    """Создаёт папку для бэкапов на Диске, если её нет."""
    try:
        await disk_client.mkdir(settings.YANDEX_DISK_PATH)
        logger.info(f"Папка {settings.YANDEX_DISK_PATH} создана")
    except yadisk.exceptions.PathExistsError:
        pass
    except Exception as e:
        logger.error(f"Не удалось создать папку: {e}")
        raise

async def upload_to_disk(local_path: Path, remote_path: str = None):
    """
    Загружает файл на Яндекс.Диск.
    local_path: путь к локальному файлу
    remote_path: путь на Диске (если None, будет использовано имя файла в папке бэкапов)
    """
    if remote_path is None:
        remote_path = f"{settings.YANDEX_DISK_PATH}/{local_path.name}"
    try:
        async with disk_client:
            await disk_client.upload(str(local_path), remote_path, overwrite=True)
        logger.info(f"Файл {local_path} загружен как {remote_path}")
    except Exception as e:
        logger.error(f"Ошибка загрузки на Диск: {e}")
        raise

async def delete_old_backups(keep_days: int = 30):
    """
    Удаляет файлы старше keep_days из папки бэкапов.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=keep_days)
    async with disk_client:
        try:
            items = await disk_client.listdir(settings.YANDEX_DISK_PATH)
            for item in items:
                if item.created and item.created < cutoff:
                    await disk_client.remove(item.path, permanently=True)
                    logger.info(f"Удалён старый файл: {item.name}")
        except Exception as e:
            logger.error(f"Ошибка при удалении старых бэкапов: {e}")