from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import stations, pages

app = FastAPI()

app.include_router(stations.router)
app.include_router(pages.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

