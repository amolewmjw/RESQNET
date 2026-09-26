"""Run with: python -m uvicorn app.main:app --reload (from backend/)."""
from contextlib import asynccontextmanager
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, make_engine
from .schemas import ResetRequest, ScenarioSummary, SimulationState
from .simulation import SimulationService, SCENARIO_IDS

DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "resqnet.db"

def create_app(database_url: str | None = None) -> FastAPI:
    url = database_url or os.getenv("RESQNET_DATABASE_URL", f"sqlite:///{DEFAULT_DB.as_posix()}")
    if not url.startswith("sqlite:///"):
        raise ValueError("Sprint 1 supports SQLite only")
    engine = make_engine(url)
    simulation = SimulationService(engine)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        Base.metadata.create_all(engine)
        simulation.initialize()
        yield
        engine.dispose()

    app = FastAPI(title="RESQNET", version="0.1.0", lifespan=lifespan,
                  description="Sprint 1: synthetic simulation foundation only")
    app.state.simulation = simulation
    app.state.engine = engine
    app.add_middleware(CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "scope": "sprint-1"}

    @app.get("/api/scenarios", response_model=list[ScenarioSummary])
    def scenarios() -> list[ScenarioSummary]:
        return [ScenarioSummary(id=s.scenario_id, title=s.title, description=s.description)
                for s in (simulation.load_definition(x) for x in SCENARIO_IDS)]

    @app.get("/api/simulation", response_model=SimulationState)
    def state() -> SimulationState:
        return simulation.state()

    @app.post("/api/simulation/reset", response_model=SimulationState)
    def reset(request: ResetRequest) -> SimulationState:
        return simulation.reset(request.scenario_id)

    return app

app = create_app()
