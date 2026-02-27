# backend/src/schemas/payment.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated, Literal
from decimal import Decimal
from datetime import date, datetime

AmountField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

class PaymentBase(BaseModel):
    order_id: int
    payment_type: Literal["client", "installer"]
    installer_id: Optional[int] = None
    amount: AmountField
    payment_date: date
    description: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(PaymentBase):
    order_id: Optional[int] = None
    payment_type: Optional[Literal["client", "installer"]] = None
    installer_id: Optional[int] = None
    amount: Optional[AmountField] = None
    payment_date: Optional[date] = None
    description: Optional[str] = None

class Payment(PaymentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)