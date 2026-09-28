"""Persisted foundation entities. A vehicle type is a label, NEVER a capacity rule."""
from sqlalchemy import Boolean, CheckConstraint, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class SimulationMeta(Base):
    __tablename__ = "simulation_meta"
    __table_args__ = (CheckConstraint("id = 1"), CheckConstraint("revision >= 1"))
    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[str]
    title: Mapped[str]
    description: Mapped[str]
    revision: Mapped[int]
    schema_version: Mapped[int]
    run_id: Mapped[str] = mapped_column(String, default="run-1")
    sim_time: Mapped[float] = mapped_column(Float, default=0)
    clock_status: Mapped[str] = mapped_column(String, default="idle")

class RoadNode(Base):
    __tablename__ = "road_nodes"
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)

class HazardZone(Base):
    __tablename__ = "hazard_zones"
    id: Mapped[str] = mapped_column(primary_key=True)
    kind: Mapped[str]
    label: Mapped[str]
    active: Mapped[bool] = mapped_column(Boolean)
    polygon: Mapped[list] = mapped_column(JSON)
    note: Mapped[str]

class Road(Base):
    __tablename__ = "roads"
    __table_args__ = (
        CheckConstraint("distance_km > 0 AND travel_time_min > 0"),
        CheckConstraint("max_width_m > 0 AND max_height_m > 0"),
        CheckConstraint("source != target"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    target: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    distance_km: Mapped[float] = mapped_column(Float)
    travel_time_min: Mapped[float] = mapped_column(Float)
    max_width_m: Mapped[float] = mapped_column(Float)
    max_height_m: Mapped[float] = mapped_column(Float)
    allowed_vehicle_classes: Mapped[list[str]] = mapped_column(JSON)
    blocked: Mapped[bool]
    hazard_zone_id: Mapped[str | None] = mapped_column(ForeignKey("hazard_zones.id"))
    restriction_note: Mapped[str]

class AmbulanceType(Base):
    __tablename__ = "ambulance_types"
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    description: Mapped[str]

class EquipmentType(Base):
    __tablename__ = "equipment_types"
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    description: Mapped[str]

class Ambulance(Base):
    __tablename__ = "ambulances"
    __table_args__ = (
        CheckConstraint("length_m > 0 AND width_m > 0 AND height_m > 0"),
        CheckConstraint("approved_stretcher_positions >= 0 AND approved_seated_positions >= 0"),
        CheckConstraint("occupied_stretcher_positions >= 0 AND occupied_stretcher_positions <= approved_stretcher_positions"),
        CheckConstraint("occupied_seated_positions >= 0 AND occupied_seated_positions <= approved_seated_positions"),
        CheckConstraint("status IN ('available','unavailable')"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    type_id: Mapped[str] = mapped_column(ForeignKey("ambulance_types.id"))
    node_id: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    home_node_id: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    vehicle_class: Mapped[str]
    length_m: Mapped[float] = mapped_column(Float)
    width_m: Mapped[float] = mapped_column(Float)
    height_m: Mapped[float] = mapped_column(Float)
    approved_stretcher_positions: Mapped[int]
    approved_seated_positions: Mapped[int]
    occupied_stretcher_positions: Mapped[int]
    occupied_seated_positions: Mapped[int]
    equipment: Mapped[dict[str, int]] = mapped_column(JSON)
    crew: Mapped[list] = mapped_column(JSON)
    declared_capabilities: Mapped[list[str]] = mapped_column(JSON)
    status: Mapped[str]
    configuration_source: Mapped[str]

class Hospital(Base):
    __tablename__ = "hospitals"
    __table_args__ = (
        CheckConstraint("category IN ('government','authorized_private','non_authorized_private')"),
        CheckConstraint("beds_total >= 0 AND beds_available >= 0 AND beds_available <= beds_total"),
        CheckConstraint("icu_total >= 0 AND icu_available >= 0 AND icu_available <= icu_total"),
        CheckConstraint("category != 'authorized_private' OR length(trim(authorization_reference)) > 0"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    node_id: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    category: Mapped[str]
    authorization_reference: Mapped[str]
    beds_total: Mapped[int]
    beds_available: Mapped[int]
    icu_total: Mapped[int]
    icu_available: Mapped[int]
    facilities: Mapped[list[str]] = mapped_column(JSON)

class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        CheckConstraint("severity IN ('critical','urgent','stable')"),
        CheckConstraint("transport_position IN ('stretcher','seated')"),
        CheckConstraint("status = 'waiting'"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str]
    incident_id: Mapped[str]
    node_id: Mapped[str] = mapped_column(ForeignKey("road_nodes.id"))
    severity: Mapped[str]
    transport_position: Mapped[str]
    required_capabilities: Mapped[list[str]] = mapped_column(JSON)
    required_equipment: Mapped[list[str]] = mapped_column(JSON)
    required_crew_roles: Mapped[list[str]] = mapped_column(JSON)
    required_facilities: Mapped[list[str]] = mapped_column(JSON)
    clinical_compatibility_group: Mapped[str]
    required_hospital_place: Mapped[str] = mapped_column(String, default="general")
    status: Mapped[str]

class Allocation(Base):
    __tablename__ = "allocations"
    __table_args__ = (
        CheckConstraint("status IN ('assigned','waiting')"),
        CheckConstraint("travel_time_min >= 0"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    revision: Mapped[int]
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    ambulance_id: Mapped[str | None] = mapped_column(ForeignKey("ambulances.id"))
    hospital_id: Mapped[str | None] = mapped_column(ForeignKey("hospitals.id"))
    pickup_path: Mapped[list[str]] = mapped_column(JSON)
    delivery_path: Mapped[list[str]] = mapped_column(JSON)
    travel_time_min: Mapped[float] = mapped_column(Float)
    factors: Mapped[dict] = mapped_column(JSON)
    waiting_reason: Mapped[str | None]
    status: Mapped[str]

class Reservation(Base):
    __tablename__ = "reservations"
    id: Mapped[str] = mapped_column(primary_key=True)
    allocation_id: Mapped[str] = mapped_column(ForeignKey("allocations.id"))
    resource_type: Mapped[str]
    resource_key: Mapped[str]
    quantity: Mapped[int]

class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (CheckConstraint("status IN ('active','delivered','blocked','idle')"),)
    id: Mapped[str] = mapped_column(primary_key=True)
    revision: Mapped[int]
    allocation_id: Mapped[str] = mapped_column(ForeignKey("allocations.id"))
    ambulance_id: Mapped[str] = mapped_column(ForeignKey("ambulances.id"))
    hospital_id: Mapped[str] = mapped_column(ForeignKey("hospitals.id"))
    patient_ids: Mapped[list[str]] = mapped_column(JSON)
    phase: Mapped[str]
    status: Mapped[str]
    current_node: Mapped[str]
    pickup_path: Mapped[list[str]] = mapped_column(JSON)
    delivery_path: Mapped[list[str]] = mapped_column(JSON)
    route_index: Mapped[int] = mapped_column(Integer, default=0)
    distance_km: Mapped[float] = mapped_column(Float, default=0)
    travel_time_min: Mapped[float] = mapped_column(Float, default=0)
    reason: Mapped[str | None]

class LedgerEvent(Base):
    __tablename__ = "ledger_events"
    __table_args__ = (CheckConstraint("sequence >= 1"),)
    sequence: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str]
    event_type: Mapped[str]
    simulation_time: Mapped[float]
    payload: Mapped[dict] = mapped_column(JSON)
    previous_hash: Mapped[str]
    event_hash: Mapped[str]
