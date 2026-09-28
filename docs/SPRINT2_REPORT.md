# Sprint 2 progress report

Status: implementation in progress on `assessment/sprint1-baseline-plan`; no merge or deployment. Approved by the user on 2026-09-28.

Implemented in this slice:

- Added `allocations` and `reservations` tables. Scenario reset deletes these dependents before rebuilding the foundation state. Added an additive startup migration for the new patient place field so an existing synthetic Sprint 1 database remains readable.
- Added `POST /api/simulation/start` with an optional expected revision. Repeated starts are idempotent; stale revisions return HTTP 409.
- Added explicit `required_hospital_place` (`general`/`icu`) with a backward-compatible `general` default for the existing synthetic fixtures.
- Added server-side NetworkX A* route selection with a zero heuristic and travel-time edge cost. It excludes blocked roads, active explicitly referenced hazards, disallowed vehicle classes, and roads narrower/lower than the configured ambulance.
- Added deterministic priority ordering (critical, urgent, stable, then patient ID), explicit ambulance equipment/capability/crew/position checks, hospital facility and authorization checks, one hospital-place reservation per assigned patient, and structured waiting reasons/factors.
- Added dashboard Start allocation control and an allocation-decision table. Reset remains the boundary for selecting a new scenario.

Observed flood smoke result: 3 assigned patients, 3 waiting patients, and 6 reservations. The waiting result is intentional: Sprint 2 does not force unsuitable vehicles or an understocked/unauthorized hospital. There is still one ambulance per patient in this sprint; grouped transport and repeated live trips are Sprint 3.

Validation completed after these changes:

- Backend: **33 passed**, one existing Starlette/httpx deprecation warning.
- Frontend production build: passed (`tsc --noEmit` and Vite).
- Browser allocation smoke test: the new Start flow passed in 1.4 seconds; the wrapper process stalled during Playwright cleanup in this Windows environment, so the clean full-suite baseline remains the earlier 4-test run. The existing browser scenarios were not re-labeled as Sprint 2 full-suite evidence.
- No runtime behavior beyond this slice is claimed: no movement, grouping, WebSockets, live road editing, reallocation, metrics, or ledger.

Known implementation limits to address before Sprint 2 acceptance:

- Allocation currently uses deterministic greedy candidate selection rather than the planned bounded exact fleet-wide optimizer.
- Reservations are persisted but hospital/ambulance live state is not yet consumed by movement or delivery; reservation accounting must be completed before claiming end-to-end conservation.
- Existing fixture hazard geometry still has the R04/R10 reference mismatch recorded in BASELINE_ASSESSMENT.md; route filtering currently follows explicit road hazard references.
- Broader schema versioning and independent multi-process contention tests remain to be completed.
