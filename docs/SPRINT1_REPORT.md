# RESQNET Sprint 1 completion report

Completed: September 27, 2026 (Asia/Kolkata). Scope: project foundation only.

## Implemented and verified

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Python/FastAPI + React/TypeScript structure | Separate backend/frontend, pinned dependencies, scripts, CI definition | Backend startup; frontend type check and production build |
| SQLite + SQLAlchemy | Nine tables, foreign keys, numeric/category constraints, persistent startup | Initialization/schema, database constraints and restart tests |
| Patient/ambulance/hospital/road models | Typed ORM and Pydantic contracts | Model validation and full API snapshot tests |
| Configurable ambulance attributes | Explicit types, inventory, crew availability, dimensions, approved positions and separate occupancy | Type-independence, negative counts and overoccupancy tests; browser display |
| Three hospital categories | Government, authorized private, non-authorized private | Category coverage, authorization and capacity validation |
| Synthetic NetworkX network | 9 nodes/12 roads with distances, times, restrictions and hazard metadata | Graph type, connectivity and edge-attribute tests |
| Three scenarios | Flood (6 patients), collapse (5), gas leak (4); each has 4 ambulances and 3 hospitals | Parameterized loading tests; real browser scenario switching |
| React resource dashboard | Offline Leaflet schematic, resource cards/tables, loading/error states | Browser tests and desktop/mobile visual inspection |
| Reset endpoint and control | Validated atomic replacement and revision increment | Mutated-resource restoration, invalid input, repeat reset, persistence, concurrent reset and rollback tests; live UI reset |
| Automated tests | pytest suite and Playwright browser suite | 30 backend tests passed; 4 browser tests passed |

## Results actually observed

- **Backend: 30 passed**, 1.05 seconds in the recorded final run.
- **Browser: 4 passed**, 4.4 seconds. Chromium 134 via Playwright 1.51.1; real FastAPI HTTP server and Vite proxy.
- **Frontend: TypeScript check and Vite production build passed.**
- Desktop screenshot at 1280px and mobile screenshot at 390px inspected; no page-level horizontal overflow in the mobile check. Resource tables intentionally scroll horizontally on small screens.
- Generated SQLite DDL, OpenAPI contract and a synthetic demonstration database are included.
- Executed on Linux, Python 3.12, Node 24.19.0. **Windows commands are documented, not executed on a Windows host. GitHub CI is supplied, not yet run.**

Raw evidence: `validation/backend.txt`, `validation/backend-junit.xml`, `validation/browser.txt`, `validation/browser-results.json`, `validation/frontend-build.txt`. Screenshots: `dashboard-desktop.png`, `dashboard-mobile.png`.

The backend suite emitted one upstream Starlette warning about the httpx-based test client. Tests passed; the warning is retained in the results. npm/test-runner environment warnings do not indicate application failures.

## Delivery and boundaries

Repository `amolewmjw/RESQNET` was supplied after the local Sprint 1 validation. This report records the tests run locally; it does not claim GitHub Actions results or deployment. README contains exact Windows startup/test commands and a file-by-file guide. ARCHITECTURE.md explains the model decisions and the recovered specification context.

All scenario data, equipment inventories, crew, dimensions, positions and authorizations are synthetic demonstration declarations, not inferred from vehicle classifications or presented as medical/engineering certifications. The scenario data does not reconstruct actual victims or hospital inventories from the research attachments.

SQLite JSON fields are validated through the scenario boundary; they are not fully normalized inventory/crew tables. One backend process and one shared simulation are supported. Authentication, real data integrations and production deployment are outside this foundation.

## Deliberately not implemented

Allocation, multi-patient grouping, hospital reservations, pathfinding/rerouting, route movement, delivery, repositioning, fleet-utilization calculations, audit services, hash chains, WebSockets and real-time simulation ticks. Only typed extension interfaces are supplied for future services. No fake success endpoints exist for these features.

**Sprint 1 ends here. Sprint 2 has not started and requires user approval.**
