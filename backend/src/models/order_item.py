# backend/src/models/order_item.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum as SQLEnum, CheckConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base
import enum

class ItemType(str, enum.Enum):
    product = "product"
    service = "service"

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(SQLEnum(ItemType), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    purchase_price = Column(Numeric(10,2), nullable=False, default=0)
    sale_price = Column(Numeric(10,2), nullable=False, default=0)
    warranty_manufacturer = Column(Integer, nullable=False, default=0)
    warranty_master = Column(Integer, nullable=False, default=0)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="items")
    item_installers = relationship("OrderItemInstaller", back_populates="order_item", cascade="all, delete-orphan")
    warranty_claims = relationship("WarrantyClaim", back_populates="order_item", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_quantity_positive'),
    )