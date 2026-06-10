from fastapi import APIRouter, HTTPException

from app.dependencies import SessionDep
from app.schemas import (
    StationBase,
    TimePeriod,
    CurrentPriceRecord,
    AggregatedPriceRecord,
)
from app import crud

router = APIRouter(
    prefix="/api/stations", responses={404: {"description": "Not found"}}
)


@router.get("/")
def get_all_stations_with_current_prices(session: SessionDep) -> list[StationBase]:
    return crud.get_all_stations_with_current_prices(session)


@router.get("/{station_id}")
def get_station(station_id: str, session: SessionDep) -> StationBase:
    station = crud.get_station_with_current_price(station_id, session)
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return station


@router.get("/{station_id}/prices/current")
def get_current_price(station_id: str, session: SessionDep) -> CurrentPriceRecord:
    """
    Returns a CurrentPriceRecord object for a single station.
    """
    prices = crud.get_current_price(station_id, session)
    if not prices:
        raise HTTPException(status_code=404, detail="No price record found")
    return prices


@router.get("/{station_id}/prices/history")
def get_price_history(
    station_id: str, session: SessionDep, period: TimePeriod = TimePeriod.three_hours
) -> list[AggregatedPriceRecord]:
    """
    Returns a list of AggregatedPriceRecord objects for a single station.

    Prices are grouped and aggregated according to the selected TimePeriod.
    Use the period parameter to control the time range.
    """
    return crud.get_price_history(station_id, session, period)
