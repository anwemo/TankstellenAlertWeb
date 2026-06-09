from fastapi import FastAPI

from app.routers import stations

app = FastAPI()

app.include_router(stations.router)

