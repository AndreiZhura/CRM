# backend/src/schemas/order_item_installer.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from decimal import Decimal
from datetime import datetime

PaymentField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

class OrderItemInstallerBase(BaseModel):
    installer_id: int
    payment_amount: PaymentField = Decimal(0)
    work_description: Optional[str] = None

class OrderItemInstallerCreate(OrderItemInstallerBase):
    pass

class OrderItemInstallerUpdate(OrderItemInstallerBase):
    installer_id: Optional[int] = None
    payment_amount: Optional[PaymentField] = None
    work_description: Optional[str] = None

class OrderItemInstaller(OrderItemInstallerBase):
    id: int
    order_item_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)