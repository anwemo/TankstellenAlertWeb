from typing import Annotated

from sqlalchemy.orm import Session
from fastapi import Depends

from app.database import engine


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
