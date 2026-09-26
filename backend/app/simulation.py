"""Scenario persistence. Validate before deleting; commit the whole reset atomically."""
from pathlib import Path
from threading import RLock
import networkx as nx
from sqlalchemy import delete, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from . import models as m
from .schemas import Scenario, ScenarioId, SimulationState
from .graph import build_road_graph

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "scenarios"
SCENARIO_IDS = ("flood", "building_collapse", "industrial_gas_leak")
TABLES = (
    ("nodes", m.RoadNode), ("hazard_zones", m.HazardZone),
    ("ambulance_types", m.AmbulanceType), ("equipment_types", m.EquipmentType),
    ("roads", m.Road), ("ambulances", m.Ambulance),
    ("hospitals", m.Hospital), ("patients", m.Patient),
)

class SimulationService:
    def __init__(self, engine: Engine, data_dir: Path = DATA_DIR) -> None:
        self.engine = engine
        self.data_dir = data_dir
        self.lock = RLock()

    def load_definition(self, scenario_id: str) -> Scenario:
        # Whitelist filenames: untrusted input must never become an arbitrary path.
        if scenario_id not in SCENARIO_IDS:
            raise ValueError("Unknown scenario")
        scenario = Scenario.model_validate_json((self.data_dir / f"{scenario_id}.json").read_text())
        if scenario.scenario_id != scenario_id:
            raise ValueError("Scenario filename and ID disagree")
        return scenario

    def initialize(self) -> None:
        with self.lock, Session(self.engine) as session:
            if session.get(m.SimulationMeta, 1) is None:
                self.reset("flood")

    def reset(self, scenario_id: ScenarioId) -> SimulationState:
        definition = self.load_definition(scenario_id)
        # Build/validate the graph before starting the destructive portion of reset.
        build_road_graph(definition)
        with self.lock:
            with Session(self.engine) as session, session.begin():
                old = session.get(m.SimulationMeta, 1)
                revision = old.revision + 1 if old else 1
                for _, model in reversed(TABLES):
                    session.execute(delete(model))
                session.execute(delete(m.SimulationMeta))
                for field, model in TABLES:
                    session.add_all(model(**record.model_dump()) for record in getattr(definition, field))
                    session.flush()  # Respect FK order without hiding it in ORM relationships.
                metadata = definition.model_dump(include={"scenario_id", "title", "description", "schema_version"})
                session.add(m.SimulationMeta(id=1, revision=revision, **metadata))
            return self.state()

    def state(self) -> SimulationState:
        with self.lock, Session(self.engine) as session, session.begin():
            meta = session.get(m.SimulationMeta, 1)
            if meta is None:
                raise RuntimeError("Simulation has not initialized")
            payload = {key: getattr(meta, key) for key in
                       ("scenario_id", "title", "description", "schema_version", "revision")}
            for field, model in TABLES:
                payload[field] = list(session.scalars(select(model).order_by(model.id)))
            return SimulationState.model_validate(payload)

    def graph(self) -> nx.Graph:
        """Build from persisted state, so future services do not use a stale cache."""
        return build_road_graph(self.state())
