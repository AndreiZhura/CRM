
from fastapi import APIRouter
from src.services.backup_service import daily_backup_and_report
from src.core.config import settings

router = APIRouter(prefix="/debug", tags=["debug"])

@router.post("/test-backup")
async def test_backup():
    try:
        await daily_backup_and_report(settings.REMINDER_EMAIL)
        return {"status": "ok", "message": "Backup completed successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}