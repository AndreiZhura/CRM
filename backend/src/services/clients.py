from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import Optional, List

from models.clients import Client
from schemas.clients import ClientCreate, ClientUpdate

async def create_clients(db:AsyncSession, client_data:ClientCreate) -> Client:
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

async def get_client(db: AsyncSession, client_id: int) -> Optional[Client]:
    result = await db.execute(select(Client).where(Client.id == client_id))
    return result.scalar_one_or_none()

async def get_clients(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Client]:
    result = await db.execute(select(Client).offset(skip).limit(limit))
    return result.scalars().all()

async def update_client(db: AsyncSession, client_id: int, client_data: ClientUpdate) -> Optional[Client]:
    client = await get_client(db, client_id)
    if client is None:
        return None

    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client

async def delete_client(db: AsyncSession, client_id: int) -> bool:
    client = await get_client(db, client_id)
    if client is None:
        return False

    await db.delete(client)
    await db.commit()
    return True