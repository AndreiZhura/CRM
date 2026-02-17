from sqlalchemy import Column, Integer, Numeric, Boolean, DateTime, ForeignKey, Enum as SQLAEnum, FetchedValue
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.db import Base
import enum

class PaymentState(str, enum.Enum):
    UNPAID = "Не оплачен"
    PARTIAL = "Частично"
    PAID = "Оплачен"

class Finance(Base):
    __tablename__ = 'finance'

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), unique=True, nullable=False)
    purchase_price = Column(Numeric(10,2), nullable=False, default=0)
    sale_price_client = Column(Numeric(10,2), nullable=False, default=0)
    installer_pay = Column(Numeric(10,2), nullable=False, default=0)
    my_commission = Column(Numeric(10,2), nullable=False, default=0)
    
    # Вычисляемые поля (заполняются базой данных)
    profit = Column(Numeric(10,2), server_default=FetchedValue(), nullable=True)
    margin = Column(Numeric(10,2), server_default=FetchedValue(), nullable=True)      # Маржинальность
    profit_percent = Column(Numeric(10,2), server_default=FetchedValue(), nullable=True)  # Процент прибыли
    
    payment_state = Column(SQLAEnum(PaymentState, name='payment_status', create_type=False, values_callable=lambda x: [e.value for e in x]), default=PaymentState.UNPAID)
    installer_returned_money = Column(Boolean, default=False)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="finance")

    # Вычисляемые свойства (для использования в коде, не в БД)
    @property
    def calculate_profit(self):
        return self.sale_price_client - self.purchase_price - self.installer_pay - self.my_commission
    
    @property
    def calculate_margin(self):
        if self.sale_price_client == 0:
            return 0
        return ((self.sale_price_client - self.purchase_price) / self.sale_price_client) * 100
    
    @property
    def calculate_profit_percent(self):
        if self.sale_price_client == 0:
            return 0
        return (self.profit / self.sale_price_client) * 100