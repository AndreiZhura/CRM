# backend/src/schemas/order_item.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from decimal import Decimal
from datetime import datetime

# Определяем типы с ограничениями для удобства переиспользования
PositiveInt = Annotated[int, Field(gt=0, description="Должно быть больше 0")]
PriceField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2, description="Цена (не может быть отрицательной")]

class OrderItemBase(BaseModel):
    order_id: int
    item_type: str  # 'product' или 'service' — можно добавить Enum позже
    name: str
    quantity: PositiveInt = 1
    purchase_price: PriceField = Decimal(0)
    sale_price: PriceField = Decimal(0)
    warranty_manufacturer: int = 0
    warranty_master: int = 0
    sort_order: Optional[int] = 0

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemUpdate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)