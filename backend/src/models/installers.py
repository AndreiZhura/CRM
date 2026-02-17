from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Numeric, ARRAY
from sqlalchemy.sql import func
from src.core.db import Base
from sqlalchemy import FetchedValue
from sqlalchemy.orm import relationship

class Installer(Base):
    __tablename__ = 'installers'

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    phone = Column(String, unique=True, nullable=False)
    backup_phone = Column(String, nullable=True)
    specialization = Column(ARRAY(String), nullable=False)  # массив строк
    rating = Column(Numeric(3,1), default=10.0)
    base_price = Column(Numeric(10,2), default=0)
    is_debtor = Column(Boolean, default=False)
    comments = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_in_funnel = Column(Boolean, default=True)
    total_orders = Column(Integer, default=0)
    poor_work_count = Column(Integer, default=0)
    warranty_visits_count = Column(Integer, default=0)
    last_incident_date = Column(DateTime(timezone=True), nullable=True)
    # quality_score — вычисляемое поле, объявим как server_default, чтобы не вставлять
    #quality_score = Column(Numeric(3,2), server_default=FetchedValue(), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)
    orders = relationship("Order", back_populates="installer")