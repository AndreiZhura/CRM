from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

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

class FinanceOut(BaseModel):
    order_id: int
    purchase_price: float
    sale_price_client: float
    installer_pay: float
    my_commission: float
    profit: float
    margin: float  # новая метрика
    profit_percent: float  # новая метрика
    installer_returned_money: bool
    payment_state: str
    id: int
    created_at: datetime
    updated_at: datetime