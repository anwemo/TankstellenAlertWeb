from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from enum import Enum


class CurrentPriceRecord(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "e5": 1.799,
                "e10": 1.779,
                "diesel": 1.699,
                "is_open": True,
                "timestamp": "2026-06-09T12:00:00",
            }
        },
    )
    e5: Decimal | None
    e10: Decimal | None
    diesel: Decimal | None
    is_open: bool
    timestamp: datetime


class AggregatedPriceRecord(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "min_e5": 1.799,
                "max_e5": 1.929,
                "avg_e5": 1.829,
                "min_e10": 1.779,
                "max_e10": 1.779,
                "avg_e10": 1.779,
                "min_diesel": 1.699,
                "max_diesel": 1.699,
                "avg_diesel": 1.699,
                "timestamp": "2026-06-09T12:00:00",
            }
        },
    )
    min_e5: Decimal | None
    max_e5: Decimal | None
    avg_e5: Decimal | None
    min_e10: Decimal | None
    max_e10: Decimal | None
    avg_e10: Decimal | None
    min_diesel: Decimal | None
    max_diesel: Decimal | None
    avg_diesel: Decimal | None
    timestamp: datetime


class StationBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "abcd1234",
                "name": "ARAL Tankstelle",
                "brand": "ARAL",
                "street": "Musterstr.",
                "house_number": "1",
                "post_code": "12345",
                "city": "Musterstadt",
                "lat": 1.234,
                "lng": 4.321,
            }
        },
    )
    id: str
    name: str | None
    brand: str | None
    street: str | None
    house_number: str | None
    post_code: str | None
    city: str | None
    lat: float | None
    lng: float | None


class TimePeriod(int, Enum):
    today = 1
    three_days = 3
    week = 7
    month = 30
    three_months = 90
    six_months = 180
    year = 365
