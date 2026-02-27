
# backend/src/models/finance.py
from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base

class Finance(Base):
    __tablename__ = "finance"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    revenue = Column(Numeric(10,2), default=0)
    cost_of_goods = Column(Numeric(10,2), default=0)
    installer_payments = Column(Numeric(10,2), default=0)
    expenses = Column(Numeric(10,2), default=0)
    warranty_costs_oleg = Column(Numeric(10,2), default=0)
    warranty_costs_installer = Column(Numeric(10,2), default=0)
    profit = Column(Numeric(10,2))  # вычисляется в БД
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="finance")
