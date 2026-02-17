from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.finance import Finance
from src.schemas.finance import FinanceCreate, FinanceUpdate

async def create_finance(db: AsyncSession, finance_data: FinanceCreate):
    finance = Finance(**finance_data.model_dump())
    db.add(finance)
    await db.commit()
    await db.refresh(finance)
    return finance

async def get_finance(db: AsyncSession, finance_id: int):
    result = await db.execute(
        select(Finance).where(Finance.id == finance_id)
    )
    return result.scalar_one_or_none()

async def get_finance_by_order(db: AsyncSession, order_id: int):
    result = await db.execute(
        select(Finance).where(Finance.order_id == order_id)
    )
    return result.scalar_one_or_none()

async def get_finances(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Finance).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_finance(db: AsyncSession, finance_id: int, finance_data: FinanceUpdate):
    finance = await get_finance(db, finance_id)
    if finance:
        update_data = finance_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(finance, key, value)
        await db.commit()
        await db.refresh(finance)
    return finance

async def delete_finance(db: AsyncSession, finance_id: int):
    finance = await get_finance(db, finance_id)
    if finance:
        await db.delete(finance)
        await db.commit()
    return finance