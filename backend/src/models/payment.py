# backend/src/models/payment.py
from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, CheckConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    payment_type = Column(String(20), nullable=False)  # 'client' или 'installer'
    installer_id = Column(Integer, ForeignKey("installers.id", ondelete="SET NULL"))
    amount = Column(Numeric(10,2), nullable=False)
    payment_date = Column(Date, nullable=False, server_default=func.current_date())
    description = Column(String)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="payments")
    installer = relationship("Installer", back_populates="payments")

    __table_args__ = (
        CheckConstraint("payment_type IN ('client', 'installer')", name='check_payment_type'),
        CheckConstraint('amount >= 0', name='check_amount_non_negative'),
    )