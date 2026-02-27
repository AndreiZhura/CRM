# backend/src/schemas/order_expense.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from decimal import Decimal
from datetime import date, datetime

AmountField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

class OrderExpenseBase(BaseModel):
    amount: AmountField
    description: Optional[str] = None
    expense_date: date
    category: str = "other"

class OrderExpenseCreate(OrderExpenseBase):
    pass

class OrderExpenseUpdate(OrderExpenseBase):
    amount: Optional[AmountField] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None
    category: Optional[str] = None

class OrderExpense(OrderExpenseBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)