from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.db import Base
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
    installer_id = Column(Integer, ForeignKey('installers.id', ondelete='SET NULL'), nullable=True)
    status = Column(SQLAEnum(OrderStatus, name='order_status', create_type=False, values_callable=lambda x: [e.value for e in x]), default=OrderStatus.NEW)
    service_type = Column(String(100), nullable=False)
    warehouse = Column(Text, nullable=True)
    service_datetime = Column(DateTime(timezone=False), nullable=False)
    delivery_datetime = Column(DateTime(timezone=False), nullable=True)
    promise = Column(Text, nullable=True)
    marker_color = Column(String(10), nullable=True)
    #address_id = Column(String, ForeignKey('address_cache.address', ondelete='RESTRICT'), nullable=True)
    address_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), onupdate=func.now(), server_default=func.now())

    client = relationship("Client", back_populates="orders")
    installer = relationship("Installer", back_populates="orders")