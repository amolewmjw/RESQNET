"""Validation boundary for seed files and API responses; no medical rules are inferred."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Positive = Annotated[float, Field(gt=0, allow_inf_nan=False)]
Count = Annotated[int, Field(ge=0, strict=True)]
ScenarioId = Literal["flood", "building_collapse", "industrial_gas_leak"]

class Record(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: str = Field(min_length=1)

class Node(Record):
    label: str
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)

class Hazard(Record):
    kind: Literal["flood", "debris", "gas"]
    label: str
    active: bool
    polygon: list[tuple[float, float]] = Field(min_length=3)
    note: str

class RoadData(Record):
    source: str
    target: str
    distance_km: Positive
    travel_time_min: Positive
    max_width_m: Positive
    max_height_m: Positive
    allowed_vehicle_classes: list[str] = Field(min_length=1)
    blocked: bool
    hazard_zone_id: str | None
    restriction_note: str

class CatalogEntry(Record):
    label: str
    description: str

class CrewMember(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    role: str
    available: bool

class AmbulanceData(Record):
    label: str
    type_id: str
    node_id: str
    home_node_id: str
    vehicle_class: str
    length_m: Positive
    width_m: Positive
    height_m: Positive
    approved_stretcher_positions: Count
    approved_seated_positions: Count
    occupied_stretcher_positions: Count
    occupied_seated_positions: Count
    equipment: dict[str, Count]
    crew: list[CrewMember]
    declared_capabilities: list[str]
    status: Literal["available", "unavailable"]
    configuration_source: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_positions(self) -> "AmbulanceData":
        # These are separate position types; a seat never substitutes for a stretcher.
        if self.occupied_stretcher_positions > self.approved_stretcher_positions:
            raise ValueError("Stretcher occupancy exceeds approved positions")
        if self.occupied_seated_positions > self.approved_seated_positions:
            raise ValueError("Seated occupancy exceeds approved positions")
        if len({c.id for c in self.crew}) != len(self.crew):
            raise ValueError("Duplicate crew ID in ambulance")
        return self

class HospitalData(Record):
    label: str
    node_id: str
    category: Literal["government", "authorized_private", "non_authorized_private"]
    authorization_reference: str
    beds_total: Count
    beds_available: Count
    icu_total: Count
    icu_available: Count
    facilities: list[str]

    @model_validator(mode="after")
    def validate_capacity(self) -> "HospitalData":
        if self.beds_available > self.beds_total or self.icu_available > self.icu_total:
            raise ValueError("Available capacity cannot exceed total")
        if self.category == "authorized_private" and not self.authorization_reference.strip():
            raise ValueError("Authorized private hospitals need an explicit reference")
        return self

class PatientData(Record):
    label: str
    incident_id: str
    node_id: str
    severity: Literal["critical", "urgent", "stable"]
    transport_position: Literal["stretcher", "seated"]
    required_capabilities: list[str]
    required_equipment: list[str]
    required_crew_roles: list[str]
    required_facilities: list[str]
    clinical_compatibility_group: str
    status: Literal["waiting"]
    required_hospital_place: Literal["general", "icu"] = "general"

class Scenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1]
    scenario_id: ScenarioId
    title: str
    description: str
    nodes: list[Node] = Field(min_length=1)
    hazard_zones: list[Hazard]
    roads: list[RoadData] = Field(min_length=1)
    ambulance_types: list[CatalogEntry]
    equipment_types: list[CatalogEntry]
    ambulances: list[AmbulanceData] = Field(min_length=1)
    hospitals: list[HospitalData] = Field(min_length=1)
    patients: list[PatientData] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_references(self) -> "Scenario":
        collections = [self.nodes, self.hazard_zones, self.roads, self.ambulance_types,
                       self.equipment_types, self.ambulances, self.hospitals, self.patients]
        for collection in collections:
            if len({x.id for x in collection}) != len(collection):
                raise ValueError("Duplicate entity IDs")
        nodes = {n.id for n in self.nodes}
        types = {t.id for t in self.ambulance_types}
        equipment = {e.id for e in self.equipment_types}
        hazards = {h.id for h in self.hazard_zones}
        edges = set()
        for road in self.roads:
            if road.source not in nodes or road.target not in nodes or road.source == road.target:
                raise ValueError("Invalid road endpoints")
            pair = tuple(sorted([road.source, road.target]))
            if pair in edges:
                raise ValueError("Parallel roads are not supported by this Graph")
            edges.add(pair)
            if road.hazard_zone_id and road.hazard_zone_id not in hazards:
                raise ValueError("Unknown hazard zone")
        for entity in [*self.ambulances, *self.hospitals, *self.patients]:
            if entity.node_id not in nodes:
                raise ValueError("Unknown location node")
        crew_ids: set[str] = set()
        for ambulance in self.ambulances:
            if ambulance.type_id not in types or ambulance.home_node_id not in nodes:
                raise ValueError("Unknown ambulance type or home node")
            if not set(ambulance.equipment) <= equipment:
                raise ValueError("Unknown equipment in ambulance")
            for member in ambulance.crew:
                if member.id in crew_ids:
                    raise ValueError("Crew member appears in multiple vehicles")
                crew_ids.add(member.id)
        for patient in self.patients:
            if not set(patient.required_equipment) <= equipment:
                raise ValueError("Unknown patient equipment requirement")
        return self

class SimulationState(Scenario):
    revision: int
    synthetic: Literal[True] = True
    run_status: Literal["idle", "allocated"] = "idle"
    clock_status: Literal["idle", "running", "paused", "complete"] = "idle"
    run_id: str = "run-1"
    sim_time: float = 0
    allocations: list[dict] = Field(default_factory=list)
    reservations: list[dict] = Field(default_factory=list)
    trips: list[dict] = Field(default_factory=list)
    ledger: list[dict] = Field(default_factory=list)
    metrics: dict = Field(default_factory=dict)

class ResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario_id: ScenarioId

class AllocationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int | None = Field(default=None, ge=1)

class StepRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int | None = Field(default=None, ge=1)
    minutes: Positive = Field(default=1, le=60)

class InterventionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int | None = Field(default=None, ge=1)
    road_id: str | None = None
    blocked: bool | None = None
    hospital_id: str | None = None
    beds_available: Count | None = None
    icu_available: Count | None = None
    note: str = Field(default="Manual synthetic intervention", max_length=200)

class ClockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int | None = Field(default=None, ge=1)
    action: Literal["pause", "resume"]

class ScenarioSummary(BaseModel):
    id: ScenarioId
    title: str
    description: str
