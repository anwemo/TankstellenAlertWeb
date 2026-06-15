from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import Station, PriceHistory
from app.schemas import AggregatedPriceRecord, StationBase


def get_stations(session: Session):
    return session.scalars(select(Station)).all()


def get_station(station_id: str, session: Session):
    return session.get(Station, station_id)


def get_current_prices(session: Session):
    subquery = (
        select(func.max(PriceHistory.id))
        .group_by(PriceHistory.station_id)
        .scalar_subquery()
    )
    return session.scalars(
        select(PriceHistory).where(PriceHistory.id.in_(subquery))
    ).all()


def get_current_price(station_id: str, session: Session):
    return session.scalar(
        select(PriceHistory)
        .where(PriceHistory.station_id == station_id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(1)
    )


def get_all_stations_with_current_prices(session: Session):
    stations = get_stations(session)
    price_records = get_current_prices(session)
    prices_by_station = {
        price_record.station_id: price_record for price_record in price_records
    }
    stations_with_prices = []
    for station in stations:
        station_data = station.to_dict()
        station_data["current_price"] = prices_by_station.get(station.id)
        station_with_price = StationBase.model_validate(station_data)
        stations_with_prices.append(station_with_price)

    def sort_key(st):
        cp = st.current_price
        is_open = cp.is_open if cp else False
        price = cp.e10 if cp and cp.e10 is not None else float("inf")
        return not is_open, price

    stations_with_prices.sort(key=sort_key)
    return stations_with_prices


def get_station_with_current_price(station_id: str, session: Session):
    station = get_station(station_id, session)
    station_data = station.to_dict()  # type: ignore
    current_price = get_current_price(station_id, session)
    station_data["current_price"] = current_price
    return StationBase.model_validate(station_data)


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
