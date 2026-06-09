from sqlalchemy import create_engine
from sqlalchemy.orm import Session, DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


sqlite_url = f"sqlite:///{settings.DB_PATH}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def get_session():
    with Session(engine) as session:
        yield session
