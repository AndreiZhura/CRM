from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import get_db
from services.finance import (
    create_finance, get_finance, get_finances, get_finance_by_order,
    update_finance, delete_finance
)
from schemas.finance import FinanceCreate, FinanceUpdate, FinanceOut

router = APIRouter(prefix="/finance", tags=["finance"])

@router.post("/", response_model=FinanceOut, status_code=status.HTTP_201_CREATED)
async def create_finance_endpoint(
    finance: FinanceCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await get_finance_by_order(db, finance.order_id)
    if existing:
        raise HTTPException(status_code=400, detail="Finance record for this order already exists")
    return await create_finance(db, finance)

@router.get("/", response_model=list[FinanceOut])
async def read_finances(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await get_finances(db, skip=skip, limit=limit)

@router.get("/order/{order_id}", response_model=FinanceOut)
async def read_finance_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    finance = await get_finance_by_order(db, order_id)
    if not finance:
        raise HTTPException(status_code=404, detail="Finance record not found for this order")
    return finance

@router.get("/{finance_id}", response_model=FinanceOut)
async def read_finance(
    finance_id: int,
    db: AsyncSession = Depends(get_db)
):
    finance = await get_finance(db, finance_id)
    if not finance:
        raise HTTPException(status_code=404, detail="Finance record not found")
    return finance

@router.put("/{finance_id}", response_model=FinanceOut)
async def update_finance_endpoint(
    finance_id: int,
    finance: FinanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await update_finance(db, finance_id, finance)
    if not updated:
        raise HTTPException(status_code=404, detail="Finance record not found")
    return updated

@router.delete("/{finance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finance_endpoint(
    finance_id: int,
    db: AsyncSession = Depends(get_db)
):
    deleted = await delete_finance(db, finance_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Finance record not found")
    return None