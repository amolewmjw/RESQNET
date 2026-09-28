"""Scenario persistence. Validate before deleting; commit the whole reset atomically."""
from pathlib import Path
from threading import RLock
import hashlib
import json
import networkx as nx
from sqlalchemy import delete, select, func
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from . import models as m
from .schemas import Scenario, ScenarioId, SimulationState
from .graph import build_road_graph, shortest_route

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
                session.execute(delete(m.Reservation))
                session.execute(delete(m.Allocation))
                session.execute(delete(m.Trip))
                for _, model in reversed(TABLES):
                    session.execute(delete(model))
                session.execute(delete(m.SimulationMeta))
                for field, model in TABLES:
                    session.add_all(model(**record.model_dump()) for record in getattr(definition, field))
                    session.flush()  # Respect FK order without hiding it in ORM relationships.
                metadata = definition.model_dump(include={"scenario_id", "title", "description", "schema_version"})
                session.add(m.SimulationMeta(id=1, revision=revision, run_id=f"run-{revision}",
                                             sim_time=0, clock_status="idle", **metadata))
            with Session(self.engine) as ledger:
                meta = ledger.get(m.SimulationMeta, 1)
                self._append_event(ledger, meta, "Reset", {"scenario_id": scenario_id, "revision": revision})
                ledger.commit()
            return self.state()

    def allocate(self, expected_revision: int | None = None) -> SimulationState:
        """Create one-patient allocations atomically from the current synthetic snapshot."""
        with self.lock:
            with Session(self.engine) as check:
                meta = check.get(m.SimulationMeta, 1)
                if meta is None:
                    raise RuntimeError("Simulation has not initialized")
                if expected_revision is not None and expected_revision != meta.revision:
                    raise ValueError("Simulation revision is stale")
                existing = list(check.scalars(select(m.Allocation).where(m.Allocation.revision == meta.revision)))
                scenario_id = meta.scenario_id
                revision = meta.revision
            if existing:
                return self.state()
            definition = self.load_definition(scenario_id)
            session = Session(self.engine)
            session.begin()
            meta = session.get(m.SimulationMeta, 1)
            if meta is None or meta.revision != revision:
                session.rollback()
                session.close()
                raise ValueError("Simulation revision changed; retry allocation")
            ambulances = {a.id: a.model_dump() for a in definition.ambulances}
            hospitals = {h.id: h.model_dump() for h in definition.hospitals}
            patients = sorted(definition.patients, key=lambda p: ({"critical": 0, "urgent": 1, "stable": 2}[p.severity], p.id))
            used_ambulances: set[str] = set()
            reserved_beds = {h: 0 for h in hospitals}
            reserved_icu = {h: 0 for h in hospitals}
            for patient in patients:
                best = None
                rejected: list[str] = []
                for aid, ambulance in ambulances.items():
                    if aid in used_ambulances or ambulance["status"] != "available":
                        continue
                    position = "approved_stretcher_positions" if patient.transport_position == "stretcher" else "approved_seated_positions"
                    if ambulance[position] - ambulance["occupied_" + patient.transport_position + "_positions"] < 1:
                        rejected.append(f"{aid}: no {patient.transport_position} position")
                        continue
                    if not set(patient.required_capabilities) <= set(ambulance["declared_capabilities"]):
                        rejected.append(f"{aid}: missing declared capability")
                        continue
                    if not set(patient.required_equipment) <= set(ambulance["equipment"]):
                        rejected.append(f"{aid}: missing equipment")
                        continue
                    if not all(any(c["role"] == role and c["available"] for c in ambulance["crew"]) for role in patient.required_crew_roles):
                        rejected.append(f"{aid}: required crew unavailable")
                        continue
                    inbound = shortest_route(definition, ambulance, ambulance["node_id"], patient.node_id)
                    if inbound is None:
                        rejected.append(f"{aid}: no accessible pickup route")
                        continue
                    for hid, hospital in hospitals.items():
                        if hospital["category"] == "non_authorized_private":
                            continue
                        if not set(patient.required_facilities) <= set(hospital["facilities"]):
                            continue
                        if patient.required_hospital_place == "icu":
                            if hospital["icu_available"] - reserved_icu[hid] < 1:
                                continue
                        elif hospital["beds_available"] - reserved_beds[hid] < 1:
                            continue
                        outbound = shortest_route(definition, ambulance, patient.node_id, hospital["node_id"])
                        if outbound is None:
                            continue
                        score = inbound["travel_time_min"] + outbound["travel_time_min"]
                        candidate = (score, aid, hid, inbound, outbound)
                        if best is None or candidate[:3] < best[:3]:
                            best = candidate
                if best is None:
                    factors = {"severity": patient.severity, "rejected_candidates": rejected,
                               "required_facilities": patient.required_facilities,
                               "required_hospital_place": patient.required_hospital_place}
                    session.add(m.Allocation(id=f"WAIT-{meta.revision}-{patient.id}", revision=meta.revision,
                                             patient_id=patient.id, ambulance_id=None, hospital_id=None,
                                             pickup_path=[], delivery_path=[], travel_time_min=0,
                                             factors=factors, waiting_reason="No feasible ambulance and authorized hospital combination",
                                             status="waiting"))
                    continue
                score, aid, hid, inbound, outbound = best
                used_ambulances.add(aid)
                if patient.required_hospital_place == "icu": reserved_icu[hid] += 1
                else: reserved_beds[hid] += 1
                allocation_id = f"ALLOC-{meta.revision}-{patient.id}"
                factors = {"severity": patient.severity, "ambulance": aid, "hospital": hid,
                            "travel_time_min": score, "pickup_route": inbound["path"],
                            "delivery_route": outbound["path"], "authorization_checked": True}
                session.add(m.Allocation(id=allocation_id, revision=meta.revision, patient_id=patient.id,
                                         ambulance_id=aid, hospital_id=hid, pickup_path=inbound["path"],
                                         delivery_path=outbound["path"], travel_time_min=score,
                                         factors=factors, waiting_reason=None, status="assigned"))
                session.add(m.Reservation(id=f"RES-{allocation_id}-vehicle", allocation_id=allocation_id,
                                          resource_type="ambulance", resource_key=aid, quantity=1))
                place = "icu" if patient.required_hospital_place == "icu" else "general_bed"
                session.add(m.Reservation(id=f"RES-{allocation_id}-hospital", allocation_id=allocation_id,
                                          resource_type=place, resource_key=hid, quantity=1))
                session.add(m.Trip(id=f"TRIP-{allocation_id}", revision=meta.revision,
                                   allocation_id=allocation_id, ambulance_id=aid, hospital_id=hid,
                                   patient_ids=[patient.id], phase="to_pickup", status="active",
                                   current_node=ambulance["node_id"], pickup_path=inbound["path"],
                                   delivery_path=outbound["path"], route_index=0, reason=None))
                self._append_event(session, meta, "AllocationCommitted", {"allocation_id": allocation_id,
                                                                            "patient_id": patient.id,
                                                                            "ambulance_id": aid,
                                                                            "hospital_id": hid,
                                                                            "factors": factors})
            session.commit()
            session.close()
        return self.state()

    def _append_event(self, session: Session, meta: m.SimulationMeta, event_type: str, payload: dict) -> None:
        previous = session.scalar(select(m.LedgerEvent).order_by(m.LedgerEvent.sequence.desc()))
        sequence = (previous.sequence + 1) if previous else 1
        previous_hash = previous.event_hash if previous else "0" * 64
        canonical = json.dumps({"sequence": sequence, "run_id": meta.run_id, "event_type": event_type,
                                "simulation_time": meta.sim_time, "payload": payload,
                                "previous_hash": previous_hash}, sort_keys=True, separators=(",", ":"))
        event_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        session.add(m.LedgerEvent(sequence=sequence, run_id=meta.run_id, event_type=event_type,
                                  simulation_time=meta.sim_time, payload=payload,
                                  previous_hash=previous_hash, event_hash=event_hash))

    def step(self, expected_revision: int | None = None, minutes: float = 1) -> SimulationState:
        with self.lock, Session(self.engine) as session, session.begin():
            meta = session.get(m.SimulationMeta, 1)
            if meta is None:
                raise RuntimeError("Simulation has not initialized")
            if expected_revision is not None and expected_revision != meta.revision:
                raise ValueError("Simulation revision is stale")
            if meta.clock_status == "paused":
                return self.state()
            trips = list(session.scalars(select(m.Trip).where(m.Trip.revision == meta.revision).order_by(m.Trip.id)))
            if not trips:
                return self.state()
            meta.clock_status = "running"
            meta.sim_time += minutes
            for trip in trips:
                if trip.status != "active":
                    continue
                path = trip.pickup_path if trip.phase == "to_pickup" else trip.delivery_path
                if trip.route_index < len(path) - 1:
                    trip.route_index += 1
                    trip.current_node = path[trip.route_index]
                    trip.travel_time_min += minutes
                    if trip.phase == "to_pickup" and trip.route_index == len(path) - 1:
                        trip.phase = "to_hospital"
                        trip.route_index = 0
                        trip.current_node = trip.delivery_path[0]
                        self._append_event(session, meta, "InTransit", {"trip_id": trip.id, "phase": trip.phase})
                elif trip.phase == "to_pickup":
                    # The ambulance started at the pickup node; begin the delivery leg.
                    trip.phase = "to_hospital"
                    trip.route_index = 0
                    trip.current_node = trip.delivery_path[0]
                    self._append_event(session, meta, "InTransit", {"trip_id": trip.id, "phase": trip.phase})
                else:
                    trip.status = "delivered"
                    trip.phase = "delivered"
                    allocation = session.get(m.Allocation, trip.allocation_id)
                    if allocation:
                        allocation.status = "assigned"
                    session.query(m.Reservation).filter(m.Reservation.allocation_id == trip.allocation_id).delete(synchronize_session=False)
                    hospital = session.get(m.Hospital, trip.hospital_id)
                    vehicle = session.get(m.Ambulance, trip.ambulance_id)
                    if vehicle:
                        vehicle.node_id = trip.current_node
                    if hospital:
                        patients = [session.get(m.Patient, pid) for pid in trip.patient_ids]
                        for patient in patients:
                            if patient and patient.required_hospital_place == "icu":
                                hospital.icu_available = max(0, hospital.icu_available - 1)
                            elif patient:
                                hospital.beds_available = max(0, hospital.beds_available - 1)
                    self._append_event(session, meta, "ResourceDelivered", {"trip_id": trip.id,
                                                                               "patient_ids": trip.patient_ids,
                                                                               "hospital_id": trip.hospital_id})
                    self._append_event(session, meta, "HospitalNotified", {"hospital_id": trip.hospital_id,
                                                                              "trip_id": trip.id,
                                                                              "synthetic": True})
                    before_waiting = session.scalar(select(func.count()).select_from(m.Allocation).where(
                        m.Allocation.revision == meta.revision, m.Allocation.status == "waiting")) or 0
                    self._dispatch_waiting(session, meta, trip.ambulance_id, trip.current_node)
                    after_waiting = session.scalar(select(func.count()).select_from(m.Allocation).where(
                        m.Allocation.revision == meta.revision, m.Allocation.status == "waiting")) or 0
                    if before_waiting == after_waiting:
                        self._append_event(session, meta, "Repositioned", {"ambulance_id": trip.ambulance_id,
                                                                             "node_id": trip.current_node,
                                                                             "reason": "No feasible waiting patient"})
            if all(t.status != "active" for t in trips):
                meta.clock_status = "complete"
        return self.state()

    def _dispatch_waiting(self, session: Session, meta: m.SimulationMeta, ambulance_id: str, current_node: str) -> None:
        """Use a delivered vehicle for the next feasible waiting patient."""
        ambulance_row = session.get(m.Ambulance, ambulance_id)
        if not ambulance_row:
            return
        definition = self.load_definition(meta.scenario_id)
        ambulance = {k: v for k, v in ambulance_row.__dict__.items() if not k.startswith("_")}
        ambulance["node_id"] = current_node
        waiting = list(session.scalars(select(m.Allocation).where(m.Allocation.revision == meta.revision,
                                                                   m.Allocation.status == "waiting").order_by(m.Allocation.id)))
        for allocation in waiting:
            patient = session.get(m.Patient, allocation.patient_id)
            if not patient:
                continue
            position = "approved_stretcher_positions" if patient.transport_position == "stretcher" else "approved_seated_positions"
            if ambulance[position] - ambulance["occupied_" + patient.transport_position + "_positions"] < 1:
                continue
            if not set(patient.required_capabilities) <= set(ambulance["declared_capabilities"]):
                continue
            if not set(patient.required_equipment) <= set(ambulance["equipment"]):
                continue
            if not all(any(c["role"] == role and c["available"] for c in ambulance["crew"]) for role in patient.required_crew_roles):
                continue
            inbound = shortest_route(definition, ambulance, current_node, patient.node_id)
            if inbound is None:
                continue
            chosen = None
            for hospital in definition.hospitals:
                if hospital.category == "non_authorized_private" or not set(patient.required_facilities) <= set(hospital.facilities):
                    continue
                persisted = session.get(m.Hospital, hospital.id)
                if not persisted:
                    continue
                if patient.required_hospital_place == "icu" and persisted.icu_available < 1:
                    continue
                if patient.required_hospital_place == "general" and persisted.beds_available < 1:
                    continue
                reserved_type = "icu" if patient.required_hospital_place == "icu" else "general_bed"
                reserved = session.scalar(select(func.coalesce(func.sum(m.Reservation.quantity), 0)).where(
                    m.Reservation.resource_type == reserved_type, m.Reservation.resource_key == hospital.id)) or 0
                if (patient.required_hospital_place == "icu" and persisted.icu_available - reserved < 1) or (
                    patient.required_hospital_place == "general" and persisted.beds_available - reserved < 1):
                    continue
                outbound = shortest_route(definition, ambulance, patient.node_id, hospital.node_id)
                if outbound:
                    chosen = (persisted, inbound, outbound)
                    break
            if not chosen:
                continue
            hospital, inbound, outbound = chosen
            allocation.status = "assigned"
            allocation.ambulance_id = ambulance_id
            allocation.hospital_id = hospital.id
            allocation.pickup_path = inbound["path"]
            allocation.delivery_path = outbound["path"]
            allocation.travel_time_min = inbound["travel_time_min"] + outbound["travel_time_min"]
            allocation.waiting_reason = None
            allocation.factors = {"reallocated_after_delivery": True, "ambulance": ambulance_id,
                                  "hospital": hospital.id, "pickup_route": inbound["path"],
                                  "delivery_route": outbound["path"]}
            session.add(m.Reservation(id=f"RES-{allocation.id}-vehicle", allocation_id=allocation.id,
                                      resource_type="ambulance", resource_key=ambulance_id, quantity=1))
            place = "icu" if patient.required_hospital_place == "icu" else "general_bed"
            session.add(m.Reservation(id=f"RES-{allocation.id}-hospital", allocation_id=allocation.id,
                                      resource_type=place, resource_key=hospital.id, quantity=1))
            session.add(m.Trip(id=f"TRIP-{allocation.id}", revision=meta.revision, allocation_id=allocation.id,
                               ambulance_id=ambulance_id, hospital_id=hospital.id, patient_ids=[patient.id],
                               phase="to_pickup", status="active", current_node=current_node,
                               pickup_path=inbound["path"], delivery_path=outbound["path"], route_index=0, reason=None))
            self._append_event(session, meta, "AllocationCommitted", {"allocation_id": allocation.id,
                                                                        "reallocated_after_delivery": True})
            break

    def clock(self, action: str, expected_revision: int | None = None) -> SimulationState:
        with self.lock, Session(self.engine) as session, session.begin():
            meta = session.get(m.SimulationMeta, 1)
            if meta is None:
                raise RuntimeError("Simulation has not initialized")
            if expected_revision is not None and expected_revision != meta.revision:
                raise ValueError("Simulation revision is stale")
            if action not in {"pause", "resume"}:
                raise ValueError("Unknown clock action")
            meta.clock_status = "paused" if action == "pause" else "running"
            self._append_event(session, meta, "ClockChanged", {"action": action})
        return self.state()

    def intervene(self, request) -> SimulationState:
        with self.lock, Session(self.engine) as session, session.begin():
            meta = session.get(m.SimulationMeta, 1)
            if meta is None:
                raise RuntimeError("Simulation has not initialized")
            if request.expected_revision is not None and request.expected_revision != meta.revision:
                raise ValueError("Simulation revision is stale")
            changed = {}
            if request.road_id:
                road = session.get(m.Road, request.road_id)
                if road is None:
                    raise ValueError("Unknown road")
                if request.blocked is None:
                    raise ValueError("blocked is required when editing a road")
                road.blocked = request.blocked
                changed["road_id"] = request.road_id
                changed["blocked"] = request.blocked
                if request.blocked:
                    definition = self.load_definition(meta.scenario_id)
                    roads = [r.model_copy(update={"blocked": request.blocked if r.id == request.road_id else r.blocked})
                             for r in definition.roads]
                    definition = definition.model_copy(update={"roads": roads})
                    for trip in session.scalars(select(m.Trip).where(m.Trip.revision == meta.revision, m.Trip.status == "active")):
                        ambulance = session.get(m.Ambulance, trip.ambulance_id)
                        hospital = session.get(m.Hospital, trip.hospital_id)
                        if not ambulance or not hospital:
                            continue
                        target = trip.pickup_path[-1] if trip.phase == "to_pickup" else hospital.node_id
                        route = shortest_route(definition, ambulance.__dict__, trip.current_node, target)
                        if route is None:
                            trip.status = "blocked"
                            trip.reason = f"No accessible route after closure of {request.road_id}"
                            self._append_event(session, meta, "RerouteBlocked", {"trip_id": trip.id, "road_id": request.road_id})
                        else:
                            if trip.phase == "to_pickup":
                                trip.pickup_path = route["path"]
                            else:
                                trip.delivery_path = route["path"]
                            trip.route_index = 0
                            trip.current_node = route["path"][0]
                            self._append_event(session, meta, "Rerouted", {"trip_id": trip.id, "road_id": request.road_id,
                                                                             "path": route["path"]})
            if request.hospital_id:
                hospital = session.get(m.Hospital, request.hospital_id)
                if hospital is None:
                    raise ValueError("Unknown hospital")
                if request.beds_available is not None:
                    if request.beds_available > hospital.beds_total:
                        raise ValueError("Hospital beds cannot exceed total capacity")
                    hospital.beds_available = request.beds_available
                    changed["beds_available"] = request.beds_available
                if request.icu_available is not None:
                    if request.icu_available > hospital.icu_total:
                        raise ValueError("Hospital ICU places cannot exceed total capacity")
                    hospital.icu_available = request.icu_available
                    changed["icu_available"] = request.icu_available
                changed["hospital_id"] = request.hospital_id
            if not changed:
                raise ValueError("An intervention target is required")
            self._append_event(session, meta, "Intervention", {**changed, "note": request.note})
        return self.state()

    def verify_ledger(self) -> dict:
        with self.lock, Session(self.engine) as session:
            events = list(session.scalars(select(m.LedgerEvent).order_by(m.LedgerEvent.sequence)))
            previous = "0" * 64
            for index, event in enumerate(events, start=1):
                canonical = json.dumps({"sequence": event.sequence, "run_id": event.run_id,
                                        "event_type": event.event_type, "simulation_time": event.simulation_time,
                                        "payload": event.payload, "previous_hash": event.previous_hash},
                                       sort_keys=True, separators=(",", ":"))
                expected = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
                if event.sequence != index or event.previous_hash != previous or event.event_hash != expected:
                    return {"valid": False, "checked": index - 1, "first_failure": event.sequence}
                previous = event.event_hash
            return {"valid": True, "checked": len(events), "head": previous, "run_id": events[-1].run_id if events else None}

    def state(self) -> SimulationState:
        with self.lock, Session(self.engine) as session, session.begin():
            meta = session.get(m.SimulationMeta, 1)
            if meta is None:
                raise RuntimeError("Simulation has not initialized")
            payload = {key: getattr(meta, key) for key in
                       ("scenario_id", "title", "description", "schema_version", "revision", "run_id", "sim_time", "clock_status")}
            for field, model in TABLES:
                payload[field] = list(session.scalars(select(model).order_by(model.id)))
            payload["allocations"] = [row.__dict__ for row in session.scalars(select(m.Allocation).where(m.Allocation.revision == meta.revision).order_by(m.Allocation.id))]
            payload["reservations"] = [row.__dict__ for row in session.scalars(select(m.Reservation).order_by(m.Reservation.id))]
            payload["trips"] = [row.__dict__ for row in session.scalars(select(m.Trip).where(m.Trip.revision == meta.revision).order_by(m.Trip.id))]
            payload["ledger"] = [row.__dict__ for row in session.scalars(select(m.LedgerEvent).order_by(m.LedgerEvent.sequence.desc()).limit(20))]
            for rows in (payload["allocations"], payload["reservations"], payload["trips"], payload["ledger"]):
                for row in rows:
                    row.pop("_sa_instance_state", None)
            payload["run_status"] = "allocated" if payload["allocations"] else "idle"
            assigned = sum(1 for a in payload["allocations"] if a["status"] == "assigned")
            delivered = sum(1 for t in payload["trips"] if t["status"] == "delivered")
            payload["metrics"] = {"patients_total": len(payload["patients"]),
                                   "assigned": assigned, "delivered": delivered,
                                   "waiting": len(payload["allocations"]) - assigned,
                                   "active_trips": sum(1 for t in payload["trips"] if t["status"] == "active"),
                                   "ledger_events": session.scalar(select(func.count()).select_from(m.LedgerEvent)) or 0}
            return SimulationState.model_validate(payload)

    def graph(self) -> nx.Graph:
        """Build from persisted state, so future services do not use a stale cache."""
        return build_road_graph(self.state())
