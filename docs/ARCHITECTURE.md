# Architecture and scope

Current handoff (September 28, 2026): Sprint 1 is merged and re-assessed in [BASELINE_ASSESSMENT.md](BASELINE_ASSESSMENT.md). [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) records the current user requirements and approval boundaries; [SPRINT_PLAN.md](SPRINT_PLAN.md) proposes the remaining work. The implementation below remains Sprint 1 only.

The follow-up [PLAN_ALIGNMENT.md](PLAN_ALIGNMENT.md) reconciles the new `plan/` references with the mandatory constraints. Planned architecture adds server-authoritative Start gating, separate A* routing and constrained batch allocation, reservation/consumption accounting, grouped multi-trip lifecycle and WebSocket updates, followed by dynamic events/benchmarks and SHA-256 verification. The standalone HTML in `plan/` is a reference, not a service wired into this app. No described future module is implemented by this documentation update.

## Basis for implementation

The user requested Sprint 1 only and directed retrieval of the latest **Share Link Access** conversation. Personal-context retrieval recovered the approved v1.3 decisions (September 26, 2026): RESQNET identity; Python/FastAPI, SQLite/SQLAlchemy, React/TypeScript/Leaflet, NetworkX; explicit crew/equipment/dimensions/approved patient positions; hospital authorization; and future multi-patient transport, road access, repositioning, disaster profiles and utilization metrics. The retrieval supplied decision summaries rather than the complete verbatim transcript. Earlier project handoff text was also read. The present user's ten Sprint 1 requirements control this implementation.

The original EL-02 problem statement and supplied disaster research were consulted as project context. Real incident counts, named patients, actual clinical inventories, hospital readiness or access restrictions were not copied into fixtures. All numeric scenario values are declared demonstration assumptions. Research documents are not evidence for those values.

## Runtime flow

1. FastAPI lifespan creates tables if missing. An empty database is seeded with flood data; an existing state is preserved.
2. React fetches scenario summaries and the full snapshot using REST. React Context shares the snapshot; Leaflet uses `CRS.Simple` with no tile service.
3. Selecting a scenario affects only the selector. Reset posts its ID to FastAPI.
4. The service reads and validates the entire selected JSON file and builds a NetworkX graph before mutation.
5. Under one process lock, a SQL transaction deletes dependent entities first, inserts parents then dependents, updates metadata, and commits once. Any failure rolls back the whole reset.
6. The service returns the complete committed snapshot. React replaces its state only on success. On failure it retains the prior display and warns that it may be stale.

The process lock also serializes snapshot reads with resets, preventing partially read state within the supported one-worker deployment. This is a small, single-simulation foundation, not a multi-process transaction/reservation design. SQLite still supplies durable transaction rollback and enabled foreign-key checks.

## Database design

Nine tables: `simulation_meta`, `road_nodes`, `hazard_zones`, `roads`, `ambulance_types`, `equipment_types`, `ambulances`, `hospitals`, `patients`.

- Every patient, ambulance and hospital refers to a road node. Each ambulance also stores its home node for later repositioning.
- Road endpoints and optional hazard zone are foreign keys. This sprint supports one undirected road per node pair.
- Ambulance type is a foreign key to a configurable label catalogue. It supplies no default capabilities or capacities.
- Vehicle inventory, crew and requirement lists use SQLite JSON columns to keep the foundation approachable. Seed validation checks equipment references and unique crew IDs. JSON references are not SQL foreign keys; future writers must reuse validation or normalize these tables.
- SQL constraints independently enforce principal numeric bounds, patient position/severity, status and hospital category/authorization.
- General beds and ICU places are separate capacity pools and are never summed as interchangeable places.
- Patient records deliberately have no real names, ages, contact data, diagnoses or addresses. Severity and transport requirements are predeclared synthetic labels, not computed triage.
- The metadata revision identifies the snapshot version and increments on reset. It is not an audit ledger.

`docs/schema.sql` is generated from the same SQLAlchemy metadata used at runtime. `docs/openapi.json` is generated from the actual app. SQLAlchemy `create_all()` is only an initial schema bootstrap; schema migrations are a future development task.

## Synthetic network and scenarios

Each scenario has 9 nodes, 12 undirected roads, 4 individually configured ambulances, 3 hospital categories, and one hazard polygon. Flood has 6 patients; collapse 5; gas leak 4. The flood and gas fixtures each block two links; collapse blocks one. A narrow lane allows only compact-class vehicles and has explicit width/height limits.

Graph edges retain distance, time, width/height limits, allowed classes, blocked status, hazard reference, hazard details and restriction note. Building a graph does not enforce access or calculate a valid route. Future routing must inspect all relevant attributes. Coordinates are schematic; distance/time are independently declared scenario inputs, not values calculated from a geographic map. Leaflet marker offsets distinguish co-located resources and do not move their node location.

Gas-leak pickup locations represent patients already staged outside the simulated exclusion polygon. No rescue-entry clearance, respiratory protective equipment capability, flood wading capability or toxicology rule is inferred.

## Future extension points — unimplemented

`interfaces.py` defines typed Protocols for routing, allocation, grouping, movement and audit. It does not instantiate these services, register endpoints for them, or return placeholder successful results.

Future work must enforce the approved rules: per-vehicle equipment/crew/capability checks; separate stretcher and seated positions; clinical grouping compatibility; same incident/pickup and one hospital initially; one hospital place per patient; individual assignment/delivery records; atomic reservations; and safe separate-transport/waiting fallback. No part of those decision algorithms runs in Sprint 1.

NumPy/pandas/SciPy, WebSockets, optimization, live movement, fleet metrics, repositioning and hashing remain future-sprint dependencies/features. They are not installed or claimed merely because they appear in the overall project stack. Native HTML controls suffice for this skeleton; no shadcn/Radix component is required yet.

## Useful official references

- FastAPI lifecycle: https://fastapi.tiangolo.com/advanced/events/
- FastAPI lifespan testing: https://fastapi.tiangolo.com/advanced/testing-events/
- React Leaflet map container: https://react-leaflet.js.org/docs/api-map/
- Leaflet API and CRS: https://leafletjs.com/reference
