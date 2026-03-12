from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Numeric, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.db import Base

class Installer(Base):
    __tablename__ = 'installers'

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    phone = Column(String, unique=True, nullable=False)
    backup_phone = Column(String, nullable=True)
    specialization = Column(ARRAY(String), nullable=False)
    rating = Column(Numeric(3,1), default=10.0)
    base_price = Column(Numeric(10,2), default=0)
    is_debtor = Column(Boolean, default=False)
    debt_amount = Column(Numeric(10,2), default=0)
    status = Column(String(20), nullable=False, default='active')
    comments = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_in_funnel = Column(Boolean, default=True)
    total_orders = Column(Integer, default=0)
    poor_work_count = Column(Integer, default=0)
    warranty_visits_count = Column(Integer, default=0)
    last_incident_date = Column(DateTime(timezone=True), nullable=True)
    # quality_score — вычисляемое поле в БД, не объявляем как колонку SQLAlchemy,
    # но можем читать его как свойство (будет доступно автоматически)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    # Новые связи (старая связь orders удалена, так как installer_id в orders больше нет)
    order_installers = relationship("OrderInstaller", back_populates="installer", cascade="all, delete-orphan")
    item_installers = relationship("OrderItemInstaller", back_populates="installer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="installer")
    responsible_claims = relationship("WarrantyClaim", foreign_keys="[WarrantyClaim.responsible_installer_id]", back_populates="responsible_installer")
    resolving_claims = relationship("WarrantyClaim", foreign_keys="[WarrantyClaim.resolving_installer_id]", back_populates="resolving_installer")
    status = Column(String(20), nullable=False, default='active')