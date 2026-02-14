from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.db import get_db
from schemas.clients import ClientCreate, ClientUpdate, ClientOut
from services.clients import (
    create_client, get_client, get_clients, update_client, delete_client
)

router = APIRouter(prefix="/clients", tags=["Clients"])

@router.post("/", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client_endpoint(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db)
):
    """Создать нового клиента"""
    client = await create_client(db, client_data)
    return client

@router.get("/", response_model=List[ClientOut])
async def read_clients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Получить список клиентов (с пагинацией)"""
    clients = await get_clients(db, skip=skip, limit=limit)
    return clients

@router.get("/{client_id}", response_model=ClientOut)
async def read_client(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить клиента по ID"""
    client = await get_client(db, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientOut)
async def update_client_endpoint(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить данные клиента"""
    client = await update_client(db, client_id, client_data)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

#@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
#async def delete_client_endpoint(
#   client_id: int,
#   db: AsyncSession = Depends(get_db)
#):
#   """Удалить клиента"""
#    deleted = await delete_client(db, client_id)
#    if not deleted:
#       raise HTTPException(status_code=404, detail="Client not found")
#    return None

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_endpoint(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Мягко удалить клиента (устанавливает deleted_at)"""
    deleted = await delete_client(db, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return None