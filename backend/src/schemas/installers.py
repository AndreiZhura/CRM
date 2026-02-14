from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class InstallerBase(BaseModel):
    full_name: str
    nickname: Optional[str] = None
    phone: str
    backup_phone: Optional[str] = None
    specialization: List[str]
    rating: Optional[float] = 10.0
    base_price: Optional[float] = 0
    is_debtor: Optional[bool] = False
    comments: Optional[str] = None
    is_active: Optional[bool] = True
    is_in_funnel: Optional[bool] = True
    total_orders: Optional[int] = 0
    poor_work_count: Optional[int] = 0
    warranty_visits_count: Optional[int] = 0
    last_incident_date: Optional[datetime] = None
    # quality_score не включаем, оно вычисляется БД

class InstallerCreate(InstallerBase):
    pass

class InstallerUpdate(InstallerBase):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[List[str]] = None
    # все поля делаем опциональными
    nickname: Optional[str] = None
    backup_phone: Optional[str] = None
    rating: Optional[float] = None
    base_price: Optional[float] = None
    is_debtor: Optional[bool] = None
    comments: Optional[str] = None
    is_active: Optional[bool] = None
    is_in_funnel: Optional[bool] = None
    total_orders: Optional[int] = None
    poor_work_count: Optional[int] = None
    warranty_visits_count: Optional[int] = None
    last_incident_date: Optional[datetime] = None

class InstallerOut(InstallerBase):
    id: int
    #quality_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)