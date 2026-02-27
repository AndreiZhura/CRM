# backend/src/models/orders.py
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.db import Base
from typing import Optional
import enum

class OrderStatus(str, enum.Enum):
    NEW = "Новый"
    WAITING_INSTALLER = "Ждет установщика"
    IN_PROGRESS = "В работе"
    COMPLETED = "Выполнен"
    CANCELLED = "Отменен"

class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id', ondelete='RESTRICT'), nullable=True)
    status = Column(SQLAEnum(OrderStatus, name='order_status', create_type=False, values_callable=lambda x: [e.value for e in x]), default=OrderStatus.NEW)
    warehouse = Column(Text, nullable=True)
    service_datetime = Column(DateTime(timezone=False), nullable=False)
    delivery_datetime = Column(DateTime(timezone=False), nullable=True)
    promise = Column(Text, nullable=True)
    marker_color = Column(String(10), nullable=True)
    address_id = Column(String, ForeignKey('address_cache.address', ondelete='RESTRICT'), nullable=True)
    address_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), onupdate=func.now(), server_default=func.now())

    # Связи
    client = relationship("Client", back_populates="orders")
    address_cache = relationship("AddressCache", foreign_keys=[address_id])
    
    # Новые связи
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    installers = relationship("OrderInstaller", back_populates="order", cascade="all, delete-orphan")
    expenses = relationship("OrderExpense", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    finance = relationship("Finance", back_populates="order", uselist=False, cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")

    @property
    def lat(self) -> Optional[float]:
        return float(self.address_cache.lat) if self.address_cache else None

    @property
    def lon(self) -> Optional[float]:
        return float(self.address_cache.lon) if self.address_cache else None