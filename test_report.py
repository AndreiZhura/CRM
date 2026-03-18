import sys
from pathlib import Path

# Добавляем путь к папке backend в sys.path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

import asyncio
from src.services.backup_service import generate_excel_report

async def test():
    local_dir = Path(".")
    file_path = await generate_excel_report(local_dir)
    print(f"Report generated: {file_path}")

if __name__ == "__main__":
    asyncio.run(test())
    