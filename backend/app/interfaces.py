"""Future sprint contracts only. No implementations, endpoints, or fake results."""
from dataclasses import dataclass
from typing import Protocol
from .schemas import SimulationState

@dataclass(frozen=True)
class RouteRequest:
    origin: str
    destination: str
    ambulance_id: str
    avoid_zones: tuple[str, ...]

@dataclass(frozen=True)
class RouteResult:
    node_ids: tuple[str, ...]
    distance_km: float
    travel_time_min: float

@dataclass(frozen=True)
class AllocationProposal:
    patient_ids: tuple[str, ...]
    ambulance_id: str
    hospital_id: str
    state_revision: int

class RoutingPort(Protocol):
    def get_route(self, request: RouteRequest, state: SimulationState) -> RouteResult | None: ...

class AllocationPort(Protocol):
    def propose(self, state: SimulationState) -> list[AllocationProposal]: ...

class GroupingPort(Protocol):
    def propose_groups(self, state: SimulationState) -> list[tuple[str, ...]]: ...

class MovementPort(Protocol):
    def tick(self, elapsed_seconds: float, state_revision: int) -> None: ...

class AuditPort(Protocol):
    def append(self, event_type: str, payload: dict[str, object]) -> str: ...
