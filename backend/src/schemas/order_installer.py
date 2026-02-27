# backend/src/schemas/order_installer.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from decimal import Decimal
from datetime import datetime

PaymentField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

class OrderInstallerBase(BaseModel):
    installer_id: int
    role: str
    base_payment: PaymentField = Decimal(0)
    is_primary: bool = False

class OrderInstallerCreate(OrderInstallerBase):
    pass

class OrderInstallerUpdate(OrderInstallerBase):
    installer_id: Optional[int] = None
    role: Optional[str] = None
    base_payment: Optional[PaymentField] = None
    is_primary: Optional[bool] = None

class OrderInstaller(OrderInstallerBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)