import json

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.schemas import TimePeriod
from app.dependencies import SessionDep
from app import crud
from app.config import BASE_DIR

router = APIRouter(
    responses={404: {"description": "Not found"}}
)

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@router.get("/", response_class=HTMLResponse)
def landing_page(request: Request, session: SessionDep):
    stations = crud.get_all_stations_with_current_prices(session)
    stations_json = json.dumps([station.model_dump(mode="json") for station in stations])
    return templates.TemplateResponse(
        name="landing.html",
        request=request,
        context={"stations": stations, "stations_json": stations_json}
    )


@router.get("/station/{station_id}", response_class=HTMLResponse)
def station_detail(request: Request, station_id: str, session: SessionDep):
    station = crud.get_station_with_current_price(station_id, session)
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    prices = crud.get_price_history(station_id, session, TimePeriod.three_hours)
    prices_json = json.dumps([price.model_dump(mode="json") for price in prices])
    return templates.TemplateResponse(
        name="detail.html",
        request=request,
        context={"station": station, "prices_json": prices_json}
    )
