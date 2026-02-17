from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from .clients import ClientOut
from .installers import InstallerOut
from .finance import FinanceOut

class OrderBase(BaseModel):
    client_id: Optional[int] = None
    installer_id: Optional[int] = None
    status: Optional[str] = "Новый"
    service_type: str
    warehouse: Optional[str] = None
    service_datetime: datetime
    delivery_datetime: Optional[datetime] = None
    promise: Optional[str] = None
    marker_color: Optional[str] = None
    #address_id: Optional[str] = None
    address_text: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(OrderBase):
    service_type: Optional[str] = None
    service_datetime: Optional[datetime] = None
    # остальные поля уже опциональны в базовом классе

class OrderOut(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None   # вложенный объект клиента
    installer: Optional[InstallerOut] = None  # вложенный объект монтажника
    finance: Optional[FinanceOut] = None  # добавляем эту строку
    model_config = ConfigDict(from_attributes=True)