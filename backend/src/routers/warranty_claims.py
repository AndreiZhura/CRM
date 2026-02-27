# backend/src/routers/warranty_claims.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.auth import get_current_admin
from src.schemas.warranty_claim import WarrantyClaimCreate, WarrantyClaimUpdate, WarrantyClaim
from src.services.warranty_claims import (
    create_warranty_claim,
    get_warranty_claim,
    get_warranty_claims_by_order_item,
    update_warranty_claim,
    delete_warranty_claim,
)

router = APIRouter(prefix="/warranty-claims", tags=["Warranty Claims"])

@router.post("/", response_model=WarrantyClaim, status_code=status.HTTP_201_CREATED)
async def create_warranty_claim_endpoint(
    claim: WarrantyClaimCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Зарегистрировать гарантийный случай."""
    return await create_warranty_claim(db, claim)

@router.get("/order-item/{order_item_id}", response_model=List[WarrantyClaim])
async def read_warranty_claims_by_order_item(
    order_item_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить все гарантийные случаи для позиции."""
    claims = await get_warranty_claims_by_order_item(db, order_item_id)
    return claims

@router.get("/{claim_id}", response_model=WarrantyClaim)
async def read_warranty_claim(
    claim_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Получить конкретный гарантийный случай."""
    claim = await get_warranty_claim(db, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Warranty claim not found")
    return claim

@router.put("/{claim_id}", response_model=WarrantyClaim)
async def update_warranty_claim_endpoint(
    claim_id: int,
    claim: WarrantyClaimUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Обновить гарантийный случай."""
    updated = await update_warranty_claim(db, claim_id, claim)
    if not updated:
        raise HTTPException(status_code=404, detail="Warranty claim not found")
    return updated

@router.delete("/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warranty_claim_endpoint(
    claim_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Удалить гарантийный случай."""
    deleted = await delete_warranty_claim(db, claim_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Warranty claim not found")
    return None
