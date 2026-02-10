from pydantic import BaseModel
from typing import Optional

class OrderCreate(BaseModel):
    fio: str
    phone: str
    address: str
    buy_price: float = 0.0
    sell_price_ac: float = 0.0
    price_install: float = 0.0
    my_commission: float = 0.0
    is_money_returned: bool = False
    status: Optional[str] = "Новая заявка"
    promises: Optional[str] = ""
    installer_opinion: Optional[str] = ""
    installer_id: Optional[int] = None


class OrderUpdate(BaseModel):
    fio: str
    phone: str
    address: str
    buy_price: float = 0.0
    sell_price_ac: float = 0.0
    price_install: float = 0.0
    my_commission: float = 0.0
    is_money_returned: bool = False
    status: Optional[str] = "Новая заявка"
    promises: Optional[str] = ""
    installer_opinion: Optional[str] = ""
    installer_id: Optional[int] = None