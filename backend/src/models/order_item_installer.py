# backend/src/models/order_item_installer.py
from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base

class OrderItemInstaller(Base):
    __tablename__ = "order_item_installers"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    installer_id = Column(Integer, ForeignKey("installers.id", ondelete="CASCADE"), nullable=False)
    payment_amount = Column(Numeric(10,2), nullable=False, default=0)
    work_description = Column(String)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order_item = relationship("OrderItem", back_populates="item_installers")
    installer = relationship("Installer", back_populates="item_installers")

    __table_args__ = (
        UniqueConstraint('order_item_id', 'installer_id', name='unique_order_item_installer'),
    )