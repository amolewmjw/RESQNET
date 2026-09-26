# RESQNET — Sprint 1 foundation

DJSCE ELEVATE 1.0 · EL-02: Intelligent & Transparent Disaster Relief Resource Allocation.

A working local simulation foundation: FastAPI + SQLAlchemy/SQLite + NetworkX, and React + TypeScript + Vite + Tailwind + React Leaflet. **Sprint 1 only.** No allocation, grouping, route planning/movement, repositioning, audit ledger, WebSockets, paid API, real map service, or real patient data is implemented.

## Start here on Windows

Install **Python 3.12 (64-bit)** and **Node.js 22.12 or newer LTS**. Install Git only if you want to push the project. Initial dependency downloads need internet; running the installed demo needs no external service or API key.

Extract the archive so the README is at `D:\Projects\resqnet\README.md`. If you choose a different folder, replace the path in the commands. These are **PowerShell** commands. Run them from the extracted project, not from inside the ZIP. No virtual-environment activation or execution-policy change is needed.

### Terminal 1 — backend

```powershell
Set-Location D:\Projects\resqnet\backend
py -3.12 --version
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Leave this terminal running. Visit `http://127.0.0.1:8000/api/health` to check the backend. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

Startup creates `backend/data/resqnet.db` and the nine SQLite tables. The first start loads the flood scenario. Later starts preserve the selected scenario and current persisted state. `create_all()` creates missing tables; it is **not** a schema migration system.

### Terminal 2 — frontend

```powershell
Set-Location D:\Projects\resqnet\frontend
node --version
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Using `npm.cmd` avoids PowerShell's `npm.ps1` execution-policy issue. Vite proxies `/api` to `127.0.0.1:8000`.

1. Inspect the map, patient records, fleet, hospitals, and road table.
2. Select Flood response, Building collapse, or Industrial gas leak.
3. Click **Reset simulation** to load that scenario's predefined state. Merely changing the dropdown does not change server state.
4. **Refresh** reads the current server state. It does not reset resources.
5. Press `Ctrl+C` in both terminals to stop.

The supplied optional `backend/data/resqnet-demo.sqlite` is a pristine generated demonstration database with the flood scenario. The app creates and uses its own `resqnet.db` by default, so the sample is not overwritten.

### Subsequent runs

Repeat only the `Set-Location` and server-start commands in each terminal. Dependency installation is needed again only if the requirements or lockfile change.

## Run tests and build

Backend tests use temporary databases and never change the default simulation database:

```powershell
Set-Location D:\Projects\resqnet\backend
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend type checking and production bundle:

```powershell
Set-Location D:\Projects\resqnet\frontend
npm.cmd run build
```

Browser integration tests require the backend running on port 8000. They **reset that synthetic database** while testing. Stop any running frontend on port 5173; Playwright starts Vite itself.

```powershell
Set-Location D:\Projects\resqnet\frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

To inspect the built frontend, run `npm.cmd run preview` and visit `http://127.0.0.1:4173`; keep the backend running. This preview server also proxies `/api`.

The included CI workflow checks backend tests and frontend builds on Ubuntu and Windows; browser integration runs on Ubuntu. **The workflow has not been run on GitHub here.** See `docs/SPRINT1_REPORT.md` for results actually obtained in this environment.

## Configuration

Edit the appropriate `backend/data/scenarios/*.json`, then reset that scenario through the UI or API. Every scenario file is complete and independent. Changes to one scenario do not automatically change the others.

- `ambulance_types`: configurable labels and descriptions only; no implicit capacity/equipment.
- `equipment_types`: configurable inventory identifiers and labels.
- `ambulances`: explicit equipment quantities, declared capabilities, crew roles/availability, vehicle class, dimensions in metres, separate approved stretcher/seated positions and occupancy, status, location and home node.
- `patients`: synthetic ID, incident, position, severity, declared equipment/crew/capability/facility requirements and unassessed compatibility group. No clinical triage is inferred.
- `hospitals`: government / authorized private / non-authorized private, explicit authorization reference, general beds and ICU places as **separate pools**, and facility labels.
- `roads`: distance in km, travel time in minutes, width/height limits in metres, explicit allowed vehicle classes, blocked flag and optional hazard-zone reference.
- `hazard_zones`: polygon in schematic coordinates, kind, active flag and note.

All inventories, approval labels, capacities, clinical labels and measurements are **fictional demonstration fixtures**, not certified ambulance specifications or medical advice. The ambulance type never supplies missing values. Position counts cannot be negative or overoccupied. A seated position cannot substitute for a stretcher position. No grouping decision is made in Sprint 1. Crew availability and capability labels are stored separately; future allocation must check both. A hospital category does not automatically authorize reimbursement or declare the facility clinically suitable.

Scenario validation rejects duplicate IDs, missing nodes/equipment/types, invalid counts, overcapacity, shared crew members, parallel road links, and missing private authorization references. Invalid data cannot partially erase the running simulation.

Optional database override, set **before** starting Uvicorn (the parent directory must exist):

```powershell
$env:RESQNET_DATABASE_URL = "sqlite:///D:/Projects/resqnet/backend/data/my-demo.db"
```

Remove the override with `Remove-Item Env:RESQNET_DATABASE_URL`. Use one backend worker for Sprint 1; the service lock coordinates requests inside that process. Do not run two backend instances against the same file.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process health and sprint scope |
| GET | `/api/scenarios` | Three available scenario summaries |
| GET | `/api/simulation` | Complete validated persisted snapshot |
| POST | `/api/simulation/reset` | Atomically restore selected scenario |

Reset body: `{"scenario_id":"building_collapse"}`. Valid IDs: `flood`, `building_collapse`, `industrial_gas_leak`.

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/simulation/reset -ContentType "application/json" -Body '{"scenario_id":"flood"}'
```

Each successful reset increments `revision`. Resource values return to the fixture baseline; the revision deliberately does not. Unknown IDs or malformed request bodies return HTTP 422 with no mutation. An invalid fixture causes a server error with transaction/state preserved; correct the file and retry. A reset is global to all viewers of this single local simulation. There is no authentication or multi-user isolation in this sprint.

## Project files

| Location | Responsibility |
| --- | --- |
| `backend/app/main.py` | App factory, startup and four REST endpoints |
| `backend/app/database.py` | SQLite engine and enabled foreign keys |
| `backend/app/models.py` | Nine SQLAlchemy tables and SQL constraints |
| `backend/app/schemas.py` | Typed API/fixture contracts and validation |
| `backend/app/simulation.py` | Seed loading, persistent snapshots, transactional resets |
| `backend/app/graph.py` | NetworkX graph with road/hazard attributes; no pathfinding |
| `backend/app/interfaces.py` | Protocols for future services; no implementations |
| `backend/data/scenarios/` | Three complete synthetic JSON fixtures |
| `backend/tests/` | Initialization, integrity, persistence and reset tests |
| `backend/requirements.txt` | Exact tested Python dependencies |
| `frontend/src/api.ts` | API calls, HTTP errors and request timeouts |
| `frontend/src/SimulationContext.tsx` | Shared snapshot, loading/error/reset state |
| `frontend/src/SimulationMap.tsx` | Offline Leaflet schematic with resource markers |
| `frontend/src/App.tsx` | Dashboard controls, cards and resource tables |
| `frontend/src/types.ts` | TypeScript API interfaces |
| `frontend/src/styles.css` | Responsive styles plus Tailwind import |
| `frontend/tests/` | Browser tests against the real FastAPI server |
| `frontend/package-lock.json` | Reproducible npm dependency resolution |
| `docs/schema.sql` | Generated SQLite DDL |
| `docs/openapi.json` | Exported API schema |
| `docs/ARCHITECTURE.md` | Data flow, model decisions and future boundaries |
| `docs/SPRINT1_REPORT.md` | Completion evidence and limitations |
| `.github/workflows/ci.yml` | Automated checks ready for GitHub |

## Troubleshooting

- `py` is not recognized: install Python 3.12 with the Windows launcher, reopen PowerShell, then retry.
- `ModuleNotFoundError`: run installation with `.\.venv\Scripts\python.exe`, then use that same interpreter for Uvicorn and pytest.
- Dashboard API error: check backend health, keep port 8000 unchanged, and inspect the backend terminal.
- Port already used: stop the earlier server with `Ctrl+C`. Ports are deliberately fixed for the Vite proxy and tests.
- Database error after future model changes: do not assume `create_all()` migrates an existing schema. Introduce a migration in a future sprint, or back up and remove only a disposable synthetic DB before recreating it.
- Browser download failure: the dashboard and production build do not require Playwright. Retry the browser installation on a network that permits its download, or install the project's matching browser bundle.

## GitHub collaboration

This source is maintained at `https://github.com/amolewmjw/RESQNET`. The Sprint 1 implementation is proposed on the `sprint-1-foundation` branch for review before merging to `main`. GitHub Actions check results are separate from the local test evidence in `docs/SPRINT1_REPORT.md`.

The `.gitignore` excludes local virtual environments, generated app databases, dependency directories and build output. Never commit real patient data. Sprint 2 requires separate user approval.
