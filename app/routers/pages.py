import json

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.schemas import StationBase
from app.dependencies import SessionDep
from app import crud
from app.config import BASE_DIR

router = APIRouter()

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

