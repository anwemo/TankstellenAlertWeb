from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import Station, PriceHistory
from app.schemas import AggregatedPriceRecord


def get_stations(session: Session):
    return session.scalars(select(Station)).all()


def get_station(station_id: str, session: Session):
    return session.get(Station, station_id)


def get_current_price(station_id: str, session: Session):
    return session.scalar(
        select(PriceHistory)
        .where(PriceHistory.station_id == station_id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(1)
    )


def _get_strftime_format(period: int) -> str:
    # three hours: raw data -> every 15 minutes
    if period <= 3:
        return "%Y-%m-%d %H:%M"
    # one day: hourly
    elif period <= 24:
        return "%Y-%m-%d %H"
    # three days: every three hours. RETURNS ONLY ONCE A DAY AT THE MOMENT
    elif period <= 72:
        return "%Y-%m-%d"
    # one week: every eight hours. RETURNS ONLY ONCE A DAY AT THE MOMENT
    elif period <= 168:
        return "%Y-%m-%d"
    # one month and three months: once a day
    elif period <= 2160:
        return "%Y-%m-%d"
    # six months and one year: once a week
    elif period <= 8760:
        return "%Y-%W"
    else:
        raise ValueError(f"Invalid period: {period}")


def get_price_history(station_id: str, session: Session, period: int):
    start_time = datetime.now() - timedelta(hours=period)
    fmt = _get_strftime_format(period)
    group = func.strftime(fmt, PriceHistory.timestamp)
    rows = session.execute(
        select(
            group,
            func.min(PriceHistory.e5),
            func.max(PriceHistory.e5),
            func.avg(PriceHistory.e5),
            func.min(PriceHistory.e10),
            func.max(PriceHistory.e10),
            func.avg(PriceHistory.e10),
            func.min(PriceHistory.diesel),
            func.max(PriceHistory.diesel),
            func.avg(PriceHistory.diesel),
        )
        .where(PriceHistory.timestamp >= start_time)
        .where(PriceHistory.station_id == station_id)
        .group_by(group)
    ).all()
    return [
        AggregatedPriceRecord(
            timestamp=datetime.strptime(row[0], fmt),
            min_e5=row[1],
            max_e5=row[2],
            avg_e5=row[3],
            min_e10=row[4],
            max_e10=row[5],
            avg_e10=row[6],
            min_diesel=row[7],
            max_diesel=row[8],
            avg_diesel=row[9],
        )
        for row in rows
    ]
