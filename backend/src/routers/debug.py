from fastapi import APIRouter, Depends
from src.services.backup_service import daily_backup_and_report
from src.core.config import settings
from src.auth import get_current_admin
from src.models.admins import Admin

router = APIRouter(prefix="/debug", tags=["debug"])

@router.post("/test-backup")
async def test_backup(current_admin: Admin = Depends(get_current_admin)):
    try:
        await daily_backup_and_report(settings.REMINDER_EMAIL)
        return {"status": "ok", "message": "Backup completed successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}