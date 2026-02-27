# backend/src/services/warranty_claims.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from src.models.warranty_claim import WarrantyClaim
from src.schemas.warranty_claim import WarrantyClaimCreate, WarrantyClaimUpdate

async def create_warranty_claim(db: AsyncSession, claim_data: WarrantyClaimCreate) -> WarrantyClaim:
    claim = WarrantyClaim(**claim_data.model_dump())
    db.add(claim)
    await db.commit()
    await db.refresh(claim)
    return claim

async def get_warranty_claim(db: AsyncSession, claim_id: int) -> Optional[WarrantyClaim]:
    result = await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.id == claim_id)
    )
    return result.scalar_one_or_none()

async def get_warranty_claims_by_order_item(db: AsyncSession, order_item_id: int) -> List[WarrantyClaim]:
    result = await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.order_item_id == order_item_id)
    )
    return result.scalars().all()

async def update_warranty_claim(db: AsyncSession, claim_id: int, claim_data: WarrantyClaimUpdate) -> Optional[WarrantyClaim]:
    claim = await get_warranty_claim(db, claim_id)
    if not claim:
        return None
    update_data = claim_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(claim, key, value)
    await db.commit()
    await db.refresh(claim)
    return claim

async def delete_warranty_claim(db: AsyncSession, claim_id: int) -> bool:
    claim = await get_warranty_claim(db, claim_id)
    if not claim:
        return False
    await db.delete(claim)
    await db.commit()
    return True
