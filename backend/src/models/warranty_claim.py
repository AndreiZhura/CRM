# backend/src/models/warranty_claim.py
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.db import Base
import enum

class FaultType(str, enum.Enum):
    manufacturer = "manufacturer"
    installer = "installer"
    other = "other"

class CostCoveredBy(str, enum.Enum):
    manufacturer = "manufacturer"
    installer = "installer"
    oleg = "oleg"

class ClaimStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    rejected = "rejected"

class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    claim_date = Column(Date, nullable=False)
    description = Column(String)
    fault_type = Column(SQLEnum(FaultType, name="fault_type"), nullable=False)
    responsible_installer_id = Column(Integer, ForeignKey("installers.id", ondelete="SET NULL"))
    resolution = Column(String)
    resolving_installer_id = Column(Integer, ForeignKey("installers.id", ondelete="SET NULL"))
    cost = Column(Numeric(10,2), nullable=False, default=0)
    cost_covered_by = Column(SQLEnum(CostCoveredBy, name="cost_covered_by"), nullable=False, default="oleg")
    status = Column(SQLEnum(ClaimStatus, name="claim_status"), default="open")
    closed_at = Column(DateTime)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

    order_item = relationship("OrderItem", back_populates="warranty_claims")
    responsible_installer = relationship("Installer", foreign_keys=[responsible_installer_id], back_populates="responsible_claims")
    resolving_installer = relationship("Installer", foreign_keys=[resolving_installer_id], back_populates="resolving_claims")