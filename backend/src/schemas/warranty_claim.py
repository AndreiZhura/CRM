from src.models.warranty_claim import FaultType, CostCoveredBy, ClaimStatus
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from decimal import Decimal
from datetime import date, datetime

CostField = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

class WarrantyClaimBase(BaseModel):
    order_item_id: int
    claim_date: date
    description: Optional[str] = None
    fault_type: FaultType                     # вместо Literal
    responsible_installer_id: Optional[int] = None
    resolution: Optional[str] = None
    resolving_installer_id: Optional[int] = None
    cost: CostField = Decimal(0)
    cost_covered_by: CostCoveredBy = CostCoveredBy.oleg   # вместо Literal
    status: ClaimStatus = ClaimStatus.open                # вместо Literal
    closed_at: Optional[datetime] = None

class WarrantyClaimCreate(WarrantyClaimBase):
    pass

class WarrantyClaimUpdate(WarrantyClaimBase):
    order_item_id: Optional[int] = None
    claim_date: Optional[date] = None
    description: Optional[str] = None
    fault_type: Optional[FaultType] = None
    responsible_installer_id: Optional[int] = None
    resolution: Optional[str] = None
    resolving_installer_id: Optional[int] = None
    cost: Optional[CostField] = None
    cost_covered_by: Optional[CostCoveredBy] = None
    status: Optional[ClaimStatus] = None
    closed_at: Optional[datetime] = None

class WarrantyClaim(WarrantyClaimBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)