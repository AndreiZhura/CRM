from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class FinanceBase(BaseModel):
    order_id: int
    purchase_price: float = 0
    sale_price_client: float = 0
    installer_pay: float = 0
    my_commission: float = 0
    installer_returned_money: bool = False
    payment_state: str = "Не оплачен"

class FinanceCreate(FinanceBase):
    pass

class FinanceUpdate(FinanceBase):
    order_id: Optional[int] = None
    purchase_price: Optional[float] = None
    sale_price_client: Optional[float] = None
    installer_pay: Optional[float] = None
    my_commission: Optional[float] = None
    installer_returned_money: Optional[bool] = None
    payment_state: Optional[str] = None

class FinanceOut(FinanceBase):
    id: int
    profit: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)