from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from src.models.installers import Installer
from src.schemas.installers import InstallerCreate, InstallerUpdate, InstallerOut

async def create_installer(db: AsyncSession, installer_data: InstallerCreate):
    installer = Installer(**installer_data.model_dump())
    db.add(installer)
    await db.commit()
    await db.refresh(installer)
    return installer

async def get_installer(db: AsyncSession, installer_id: int):
    result = await db.execute(
        select(Installer)
        .where(Installer.id == installer_id)
        .where(Installer.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()

async def get_installers(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Installer)
        .where(Installer.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def update_installer(db: AsyncSession, installer_id: int, installer_data: InstallerUpdate):
    installer = await get_installer(db, installer_id)
    if installer:
        update_data = installer_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(installer, key, value)
        await db.commit()
        await db.refresh(installer)
    return installer

async def delete_installer(db: AsyncSession, installer_id: int):
    installer = await get_installer(db, installer_id)
    if installer:
        installer.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(installer)
    return installer