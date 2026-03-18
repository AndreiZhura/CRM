from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ClientBase(BaseModel):
    full_name: str
    phone: str
    address: str
    comments: Optional[str] = None
    backup_phone: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None          # исправлено: было addres
    comments: Optional[str] = None         # исправлено: было commets
    backup_phone: Optional[str] = None     # добавлено (отсутствовало)

class ClientOut(ClientBase):
    id: int
    coordinates: Optional[tuple[float, float]] = None
    created_at: datetime
    last_contact: datetime
    # updated_at и deleted_at обычно не возвращаются в списках, но можно добавить при необходимости
    # updated_at: Optional[datetime] = None
    # deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)