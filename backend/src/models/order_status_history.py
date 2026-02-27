from sqlalchemy import Column, Integer, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base
from src.models.orders import OrderStatus

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(OrderStatus, name='order_status', create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False)
    changed_at = Column(DateTime(timezone=False), server_default=func.now())

    order = relationship("Order", back_populates="status_history")