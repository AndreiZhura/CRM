from .order_installer import OrderInstaller
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List
from .clients import ClientOut
from .order_item import OrderItem
from .order_installer import OrderInstaller
from .order_expense import OrderExpense
from .payment import Payment
from .finance import FinanceOut

class OrderBase(BaseModel):
    client_id: Optional[int] = None
    status: Optional[str] = "Новый"
    warehouse: Optional[str] = None
    service_datetime: datetime
    delivery_datetime: Optional[datetime] = None
    promise: Optional[str] = None
    marker_color: Optional[str] = None
    address_text: Optional[str] = None

class OrderCreate(OrderBase):
    @field_validator('service_datetime', 'delivery_datetime', mode='before')
    @classmethod
    def make_naive(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.replace(tzinfo=None)
        return value

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "service_datetime": "2026-02-21T12:45:00",
                    "delivery_datetime": "2026-02-20T07:00:00"
                }
            ]
        }
    )

class OrderUpdate(OrderBase):
    service_datetime: Optional[datetime] = None
    delivery_datetime: Optional[datetime] = None

    @field_validator('service_datetime', 'delivery_datetime', mode='before')
    @classmethod
    def make_naive(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.replace(tzinfo=None)
        return value

class OrderOut(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None
    finance: Optional[FinanceOut] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    items: List[OrderItem] = []
    installers: List[OrderInstaller] = []
    expenses: List[OrderExpense] = []
    payments: List[Payment] = []

    model_config = ConfigDict(from_attributes=True)
    
    

    @classmethod
    def get_coords_from_address_cache(cls, value, info):
        address_cache = info.data.get('address_cache')
        if address_cache:
            if info.field_name == 'lat':
                return float(address_cache.lat)
            elif info.field_name == 'lon':
                return float(address_cache.lon)
        return None

class OrderListOut(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None
    finance: Optional[FinanceOut] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    installers: List[OrderInstaller] = []   # <-- добавляем
    model_config = ConfigDict(from_attributes=True)