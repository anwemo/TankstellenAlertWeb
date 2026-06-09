from fastapi import APIRouter

from app.dependencies import SessionDep
from app.schemas import (
    StationBase,
    TimePeriod,
    CurrentPriceRecord,
    AggregatedPriceRecord,
)

router = APIRouter(
    prefix="/api/stations", responses={404: {"description": "Not found"}}
)


@router.get("/")
def get_stations(session: SessionDep) -> list[StationBase]:
    pass


@router.get("/{id}")
def get_station(station_id: str, session: SessionDep) -> StationBase:
    pass


@router.get("/{id}/prices/current")
def get_current_price(station_id: str, session: SessionDep) -> CurrentPriceRecord:
    """
    Returns a CurrentPriceRecord object for a single station.
    """
    pass


@router.get("/{id}/prices/history")
def get_price_history(
    station_id: str, session: SessionDep, period: TimePeriod = TimePeriod.week
) -> list[AggregatedPriceRecord]:
    """
    Returns a list of AggregatedPriceRecord objects for a single station.

    Prices are grouped and aggregated according to the selected TimePeriod.
    Use the period parameter to control the time range.
    """
    pass
