from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import get_db
from services.installers import (
    create_installer, get_installer, get_installers,
    update_installer, delete_installer
)
from schemas.installers import InstallerCreate, InstallerUpdate, InstallerOut

router = APIRouter(prefix="/installers", tags=["installers"])

@router.post("/", response_model=InstallerOut, status_code=status.HTTP_201_CREATED)
async def create_installer_endpoint(
    installer: InstallerCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_installer(db, installer)

@router.get("/", response_model=list[InstallerOut])
async def read_installers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await get_installers(db, skip=skip, limit=limit)

@router.get("/{installer_id}", response_model=InstallerOut)
async def read_installer(
    installer_id: int,
    db: AsyncSession = Depends(get_db)
):
    installer = await get_installer(db, installer_id)
    if not installer:
        raise HTTPException(status_code=404, detail="Installer not found")
    return installer

@router.put("/{installer_id}", response_model=InstallerOut)
async def update_installer_endpoint(
    installer_id: int,
    installer: InstallerUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await update_installer(db, installer_id, installer)
    if not updated:
        raise HTTPException(status_code=404, detail="Installer not found")
    return updated

@router.delete("/{installer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installer_endpoint(
    installer_id: int,
    db: AsyncSession = Depends(get_db)
):
    deleted = await delete_installer(db, installer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Installer not found")
    return None