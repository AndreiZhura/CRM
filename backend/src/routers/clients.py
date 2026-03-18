from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.db import get_db
from src.models.admins import Admin
from src.schemas.clients import ClientCreate, ClientUpdate, ClientOut
from src.services.clients import create_client, get_client, get_clients, update_client, delete_client
from src.auth import get_current_admin


router = APIRouter(prefix="/clients", tags=["Clients"])

@router.post("/", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client_endpoint(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    client = await create_client(db, client_data)
    return client

@router.get("/", response_model=List[ClientOut])
async def read_clients(
    skip: int = 0,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    clients = await get_clients(db, skip=skip, limit=limit)
    return clients

@router.get("/{client_id}", response_model=ClientOut)
async def read_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    client = await get_client(db, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientOut)
async def update_client_endpoint(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    client = await update_client(db, client_id, client_data)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_endpoint(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    deleted = await delete_client(db, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return None