# Импорт нужных типов
from sqlalchemy import Column, Integer, String, DateTime, Text

import sqlalchemy
from sqlalchemy.sql import func
# Base — наш базовый класс из db.py, от которого наследуются все модели.
from core.db import Base


class LatLngType(sqlalchemy.types.UserDefinedType):
    """Кастомный тип для PostgreSQL POINT"""
    cache_ok = True

    def get_col_spec(self):
        return "POINT"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            # ждём кортеж (lat, lon) или список
            lat, lon = value[0], value[1]
            return f"({lat},{lon})"
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            # из строки "(lat,lon)" делаем кортеж
            value = value.strip('()')
            lat, lon = map(float, value.split(','))
            return (lat, lon)
        return process


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    address = Column(String, nullable=False)
    coordinates = Column(LatLngType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_contact = Column(DateTime(timezone=True),
                          server_default=func.now(), onupdate=func.now())
    comments = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
