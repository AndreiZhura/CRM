from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from src.models.finance import Finance
from src.schemas.finance import FinanceCreate, FinanceUpdate
from src.models.orders import Order

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

# ===== ИЗМЕНЕНИЯ ЗДЕСЬ =====
async def get_finance_summary(db: AsyncSession, completed: bool = False):
    """Возвращает сводку по финансам с возможностью фильтрации только по выполненным заказам"""
    stmt = select(
        func.sum(Finance.profit).label("total_profit"),
        func.sum(Finance.installer_payments).label("total_installer_pay"),
        func.count(Finance.id).label("total_orders")
    )
    
    if completed:
        # Присоединяем заказы и фильтруем по статусу "Выполнен"
        stmt = stmt.join(Finance.order).where(Order.status == "Выполнен")
    
    result = await db.execute(stmt)
    row = result.one()
    
    total_profit = row.total_profit or 0.0
    total_installer_pay = row.total_installer_pay or 0.0
    total_orders = row.total_orders or 0
    
    avg_profit = total_profit / total_orders if total_orders > 0 else 0
    
    return {
        "total_profit": float(total_profit),
        "total_installer_pay": float(total_installer_pay),
        "total_orders": total_orders,
        "avg_profit": float(avg_profit),
    }

async def get_monthly_profit(db: AsyncSession, completed: bool = False):
    """Возвращает прибыль по месяцам с возможностью фильтрации только по выполненным заказам"""
    stmt = select(
        extract('year', Finance.created_at).label('year'),
        extract('month', Finance.created_at).label('month'),
        func.sum(Finance.profit).label('profit')
    )
    
    if completed:
        stmt = stmt.join(Finance.order).where(Order.status == "Выполнен")
    
    stmt = stmt.group_by('year', 'month').order_by('year', 'month')
    
    result = await db.execute(stmt)
    rows = result.all()
    monthly_data = [{"year": int(r.year), "month": int(r.month), "profit": float(r.profit)} for r in rows]
    return monthly_data
# ============================