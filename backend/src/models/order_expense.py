# backend/src/models/order_expense.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base
from sqlalchemy import CheckConstraint

class OrderExpense(Base):
    __tablename__ = "order_expenses"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10,2), nullable=False)
    description = Column(String)
    expense_date = Column(Date, nullable=False, server_default=func.current_date())
    category = Column(String(50), default='other')
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="expenses")

    __table_args__ = (
        CheckConstraint('amount >= 0', name='check_amount_non_negative'),
    )