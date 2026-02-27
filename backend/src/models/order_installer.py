# backend/src/models/order_installer.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Boolean, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base

class OrderInstaller(Base):
    __tablename__ = "order_installers"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    installer_id = Column(Integer, ForeignKey("installers.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    base_payment = Column(Numeric(10,2), nullable=False, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="installers")
    installer = relationship("Installer", back_populates="order_installers")

    __table_args__ = (
        UniqueConstraint('order_id', 'installer_id', 'role', name='unique_order_installer_role'),
    )