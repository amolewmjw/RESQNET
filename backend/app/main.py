"""Run with: python -m uvicorn app.main:app --reload (from backend/)."""
from contextlib import asynccontextmanager
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, make_engine, migrate_sprint2
from .schemas import AllocationRequest, ClockRequest, InterventionRequest, ResetRequest, ScenarioSummary, SimulationState, StepRequest
from .simulation import SimulationService, SCENARIO_IDS

DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "resqnet.db"

def create_app(database_url: str | None = None) -> FastAPI:
    url = database_url or os.getenv("RESQNET_DATABASE_URL", f"sqlite:///{DEFAULT_DB.as_posix()}")
    if not url.startswith("sqlite:///"):
        raise ValueError("Sprint 1 supports SQLite only")
    engine = make_engine(url)
    simulation = SimulationService(engine)
    sockets: set[WebSocket] = set()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        Base.metadata.create_all(engine)
        migrate_sprint2(engine)
        simulation.initialize()
        yield
        engine.dispose()

    app = FastAPI(title="RESQNET", version="1.0.0", lifespan=lifespan,
                  description="Synthetic disaster relief allocation and transparent response simulator")
    app.state.simulation = simulation
    app.state.engine = engine
    app.add_middleware(CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "scope": "sprint-2"}

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

    @app.post("/api/simulation/start", response_model=SimulationState)
    def start(request: AllocationRequest) -> SimulationState:
        try:
            return simulation.allocate(request.expected_revision)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    async def broadcast(snapshot: SimulationState) -> None:
        stale = []
        message = snapshot.model_dump(mode="json")
        for socket in sockets:
            try:
                await socket.send_json(message)
            except Exception:
                stale.append(socket)
        sockets.difference_update(stale)

    @app.post("/api/simulation/step", response_model=SimulationState)
    async def step(request: StepRequest) -> SimulationState:
        try:
            snapshot = simulation.step(request.expected_revision, request.minutes)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await broadcast(snapshot)
        return snapshot

    @app.post("/api/simulation/intervene", response_model=SimulationState)
    async def intervene(request: InterventionRequest) -> SimulationState:
        try:
            snapshot = simulation.intervene(request)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await broadcast(snapshot)
        return snapshot

    @app.post("/api/simulation/clock", response_model=SimulationState)
    async def clock(request: ClockRequest) -> SimulationState:
        try:
            snapshot = simulation.clock(request.action, request.expected_revision)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await broadcast(snapshot)
        return snapshot

    @app.get("/api/metrics")
    def metrics() -> dict:
        return simulation.state().metrics

    @app.get("/api/ledger/verify")
    def verify_ledger() -> dict:
        return simulation.verify_ledger()

    @app.websocket("/api/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()
        sockets.add(websocket)
        try:
            await websocket.send_json(simulation.state().model_dump(mode="json"))
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            sockets.discard(websocket)
        except Exception:
            sockets.discard(websocket)

    return app

app = create_app()
