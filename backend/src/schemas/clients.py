# BaseModel — родительский класс для всех Pydantic-схем.
from pydantic import BaseModel, ConfigDict
# ConfigDict — настройки схемы (например, from_attributes).
# datetime — для полей с датой.
# Optional — для необязательных полей.
from datetime import datetime
from typing import Optional


class ClientBase(BaseModel):
    full_name: str
    phone: str
    address: str
    comments: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    addres: Optional[str] = None
    commets: Optional[str] = None


class ClientOut(ClientBase):
    id: int
    coordinates: Optional[tuple[float, float]] = None
    created_at: datetime
    last_contact: datetime

    model_config = ConfigDict(from_attributes=True)