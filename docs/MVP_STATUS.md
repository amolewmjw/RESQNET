# RESQNET MVP status

This branch contains the approved Sprint 2 foundation plus the remaining MVP runtime slice.

Implemented behavior:

- Synthetic flood, building-collapse and industrial-gas-leak fixtures.
- Explicit patient requirements, ambulance equipment/crew/capacity, hospital authorization and accessible NetworkX routing.
- Start-gated atomic reservations and persisted individual allocation decisions.
- Deterministic simulation clock with pause/resume/step controls and persisted trip lifecycle records.
- WebSocket snapshot/update stream at `/api/ws`.
- Synthetic road and hospital interventions at `/api/simulation/intervene`, with active-trip reroute or visible hold.
- SHA-256 append-only event chain with `/api/ledger/verify`.
- Live counters for assigned, waiting, delivered, active trips and ledger events.

Runtime endpoints include `POST /api/simulation/start`, `POST /api/simulation/step`, `POST /api/simulation/clock`, `POST /api/simulation/intervene`, `GET /api/metrics`, `GET /api/ledger/verify`, and the snapshot stream `WS /api/ws`.

The simulator uses only repository fixtures and does not contact real hospitals, expose real patient data, or claim clinical outcomes. Trips carry individual patient IDs in persisted records. The current fixtures are deliberately `unassessed`, so the allocator keeps them as separate trips; multi-patient grouping remains a clearly bounded follow-on extension rather than an inferred decision.

Validation commands:

```powershell
cd backend
\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run build
```

The dashboard remains local-only. Start the API on port 8000 and the Vite dashboard on port 5173 for the demo.
