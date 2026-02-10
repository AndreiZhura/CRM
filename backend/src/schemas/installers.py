# --- МОДЕЛИ ДАННЫХ ---
from pydantic import BaseModel
from typing import Optional

class InstallerCreate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    rating: int = 10
    dossier: Optional[str] = None
    is_debtor: bool = False
    debt_amount: float = 0.0  # Финансы
    base_price: float = 0.0
    status: str = "Новый"


class InstallerUpdate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    rating: int = 10
    dossier: Optional[str] = None
    is_debtor: bool = False   # Позволяет менять статус долга
    debt_amount: float = 0.0  # Позволяет менять сумму долга
    base_price: float = 0.0
    status: str = "В работе"
