from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.sql import func
from core.db import Base


class AddressCache(Base):
    __tablename__ = 'address_cache'

    address = Column(String, primary_key=True)
    lat = Column(Numeric(10, 7), nullable=False)
    lon = Column(Numeric(10, 7), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())
   
