import asyncio
import sys
from pathlib import Path

# Добавляем путь к backend в sys.path, чтобы импортировать src
sys.path.insert(0, str(Path(__file__).parent))

from src.services.backup_service import daily_backup_and_report

async def main():
    # Email можно передать аргументом командной строки, иначе используется тестовый
    recipient = sys.argv[1] if len(sys.argv) > 1 else "test@example.com"
    print(f"Запуск бэкапа для {recipient}...")
    await daily_backup_and_report(recipient)
    print("Готово.")

if __name__ == "__main__":
    asyncio.run(main())