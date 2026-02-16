from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.db import get_db
from models.admins import Admin
from schemas.auth import AdminCreate, AdminLogin, Token, AdminOut
from auth import get_password_hash, verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=AdminOut)
async def register(admin_data: AdminCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Registration disabled.")
    hashed = get_password_hash(admin_data.password)
    admin = Admin(username=admin_data.username, password_hash=hashed)
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin

@router.post("/login", response_model=Token)
async def login(login_data: AdminLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).where(Admin.username == login_data.username))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": admin.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin