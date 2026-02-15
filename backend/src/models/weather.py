from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime
from sqlalchemy.sql import func
from core.db import Base

class Weather(Base):
    __tablename__ = 'weather'

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    location = Column(String(100), nullable=False)
    lat = Column(Numeric(10,7), nullable=True)
    lon = Column(Numeric(10,7), nullable=True)
    temperature_avg = Column(Numeric(4,1), nullable=True)
    temperature_min = Column(Numeric(4,1), nullable=True)
    temperature_max = Column(Numeric(4,1), nullable=True)
    humidity = Column(Integer, nullable=True)
    pressure = Column(Integer, nullable=True)
    wind_speed = Column(Numeric(4,1), nullable=True)
    precipitation = Column(Numeric(5,2), nullable=True)
    weather_condition = Column(String(50), nullable=True)
    source = Column(String(20), default='open-meteo')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())