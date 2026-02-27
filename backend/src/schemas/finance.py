from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from decimal import Decimal

class FinanceBase(BaseModel):
    order_id: int
    revenue: Decimal = Decimal(0)
    cost_of_goods: Decimal = Decimal(0)
    installer_payments: Decimal = Decimal(0)
    expenses: Decimal = Decimal(0)
    warranty_costs_oleg: Decimal = Decimal(0)
    warranty_costs_installer: Decimal = Decimal(0)

class FinanceCreate(FinanceBase):
    pass

class FinanceUpdate(FinanceBase):
    order_id: Optional[int] = None
    revenue: Optional[Decimal] = None
    cost_of_goods: Optional[Decimal] = None
    installer_payments: Optional[Decimal] = None
    expenses: Optional[Decimal] = None
    warranty_costs_oleg: Optional[Decimal] = None
    warranty_costs_installer: Optional[Decimal] = None

class FinanceOut(FinanceBase):
    id: int
    profit: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)