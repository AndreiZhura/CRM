from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AdminCreate(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AdminOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True