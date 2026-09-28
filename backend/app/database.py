"""SQLite setup. App factories own their engine; tests never touch the demo database."""
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

def make_engine(database_url: str) -> Engine:
    engine = create_engine(database_url, connect_args={"check_same_thread": False, "timeout": 15})

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _record) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.close()

    return engine

def migrate_sprint2(engine: Engine) -> None:
    """Apply the small additive Sprint 2 migration for existing synthetic databases."""
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("patients")}
        if "required_hospital_place" not in columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN required_hospital_place VARCHAR NOT NULL DEFAULT 'general'"))
        meta_columns = {column["name"] for column in inspect(connection).get_columns("simulation_meta")}
        if "run_id" not in meta_columns:
            connection.execute(text("ALTER TABLE simulation_meta ADD COLUMN run_id VARCHAR NOT NULL DEFAULT 'run-1'"))
        if "sim_time" not in meta_columns:
            connection.execute(text("ALTER TABLE simulation_meta ADD COLUMN sim_time FLOAT NOT NULL DEFAULT 0"))
        if "clock_status" not in meta_columns:
            connection.execute(text("ALTER TABLE simulation_meta ADD COLUMN clock_status VARCHAR NOT NULL DEFAULT 'idle'"))
