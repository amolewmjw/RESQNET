# Sprint 1 baseline assessment

Assessed: September 28, 2026 (Asia/Kolkata). Repository: `amolewmjw/RESQNET`.

## Baseline and preservation

GitHub and the fresh local clone both identify `main` at `8338ea538c8c293801fae9a6b58a1a6b6f765c1d` (merged PR #1, Sprint 1 foundation). The starting workspace `D:\Project\ResQNet` was empty. Created separate local branch `assessment/sprint1-baseline-plan` before documentation changes. No AGENTS.md was found in the repository or inspected ancestor directories.

Read README.md, ARCHITECTURE.md, SPRINT1_REPORT.md, all backend/frontend source, scenario definitions, tests, package manifests, and CI workflow. Application source, dependency pins/lockfile, fixtures, original screenshots, and the tracked sample database are preserved. Changes in this assessment are documentation, new validation evidence, and an ignore rule for local `.tools/`. These are saved as uncommitted local changes on the assessment branch. No Sprint 2 implementation, merge, deployment, or remote push is part of this assessment. Test servers were stopped after verification.

## Fresh verification

| Check | Observed result | Evidence |
| --- | --- | --- |
| Pinned Python dependency installation | Successful in `backend/.venv`; `pip check` reported no broken requirements | `validation/baseline-2026-09-28/python-freeze.txt` |
| Backend pytest suite | **30 passed**, 1 upstream warning, 13.56 seconds | `backend.txt`, `backend-junit.xml` in the evidence directory |
| Locked npm installation | **90 packages added**, exit 0; audit findings below | `npm-install.txt` |
| TypeScript and production build | **Passed**, Vite 7.3.6, 77 modules; build phase 7.52 seconds | `frontend-build.txt` |
| Live Uvicorn HTTP smoke check | Health, scenario catalogue, and flood snapshot passed | `live-probe.txt` |
| Exported OpenAPI | Matches the live runtime schema exactly | `live-probe.txt` |
| Tracked demonstration SQLite | Read-only integrity and foreign-key checks passed; flood with six patients | `live-probe.txt` |
| Browser suite | **4 passed**, 34.6 seconds, clean exit 0; real backend and Vite proxy | `browser.txt`, `browser-results.json`, dated desktop/mobile captures |
| GitHub Actions at baseline commit | **All three jobs passed:** Windows foundation, Ubuntu foundation, Ubuntu browser | `github-ci.json`; [run 36268287267](https://github.com/amolewmjw/RESQNET/actions/runs/36268287267) |

Evidence directory: [validation/baseline-2026-09-28](validation/baseline-2026-09-28). The original `SPRINT1_REPORT.md` and its evidence describe an earlier Linux run; they were not substituted for these checks. CI status was read through the GitHub connector and is evidence for the baseline commit, not for future changes.

The backend warning is `StarletteDeprecationWarning` about the httpx-based TestClient. It did not fail tests. Browser/tooling color warnings are environment warnings. `pip check` checks dependency consistency, not security vulnerabilities; no Python vulnerability audit is claimed. The browser suite verified scenario switching, API-error recovery, failed-reset recovery, and mobile viewport overflow. Desktop/mobile captures were also visually inspected; resource tables intentionally scroll horizontally on mobile.

## What currently works

- FastAPI exposes four REST operations: health, scenario list, full persisted snapshot, and reset.
- SQLite initializes nine tables; snapshots survive restart. Validation and tested SQL constraints reject invalid references/counts. Reset validates first and commits transactionally; invalid requests, corrupt fixtures, and injected database failure preserve the previous state.
- Fixtures load flood (6 patients), collapse (5), and gas leak (4). Each has 9 nodes, 12 roads, 4 explicit ambulances, 3 hospitals, and a hazard polygon. Blocked-link counts are 2, 1, and 2 respectively.
- Individual patient urgency/position/requirements, explicit vehicle equipment/crew/capabilities/dimensions/positions, and separate hospital bed/ICU pools are stored. Type labels do not supply capacity or equipment.
- NetworkX retains road and hazard attributes. This is graph construction, not an accessibility or routing algorithm.
- React/Leaflet dashboard implementation displays a schematic offline map, patients, fleet, hospitals, roads, and scenario/reset/refresh controls. Browser verification results are recorded in the table above.

## Gaps and follow-up priorities

1. **Most final MVP behavior is intentionally absent.** No allocation/grouping, hospital reservation, route search, movement/delivery, WebSockets, notifications, rerouting/reallocation, repositioning, utilization metrics, decision engine, or hash ledger exists. Protocols in `interfaces.py` are only contracts. All patients remain `waiting` without allocation-specific reasons because no allocation is attempted yet.
2. **Reservation-ready schema is missing.** Patient equipment and crew requirements are lists rather than quantity/shareability contracts. Patients have no explicit general-bed versus ICU-place requirement. Assignment, trip, reservation, and delivery tables do not exist. Current status constraints only allow waiting patients and available/unavailable vehicles. A versioned migration is needed before extending them; `create_all()` cannot migrate them.
3. **Grouping is not yet clinically assessed.** Every fixture uses `clinical_compatibility_group: unassessed`. This must never be interpreted as a compatible group. Original fixtures also lack a positive explicitly compatible grouping example; later sprints need deliberate synthetic fixtures and negative cases.
4. **Hazard references and geometry need reconciliation before routing.** In all three fixtures, N5 lies inside the active polygon. R04 (N5–N6) and R10 (N5–N8) have no hazard reference. Routing that checks only the reference could cross the drawn zone. The probe records this data mismatch; no present routing feature is claimed broken because none exists. Roads have width/height limits but no length/turn restriction; vehicle length is stored only.
5. **Reset locking is not allocation concurrency protection.** The current RLock only coordinates one service instance in one process. Tests verify concurrent resets through that instance, not database reservation contention between independent writers. JSON inventory/crew references also require validated mutation paths. One backend worker and one shared simulation remain the supported deployment.
6. **Development dependency advisory remains.** npm audit reports two high-severity package entries (`playwright` and `@playwright/test`) arising from one underlying browser-download certificate-verification advisory, [GHSA-7mvr-c777-76hp](https://github.com/advisories/GHSA-7mvr-c777-76hp). Installed Playwright is 1.51.1; audit lists affected versions below 1.55.1 and proposes 1.63.0. These are development/test dependencies. Pins were preserved to measure the baseline; upgrade to a reviewed patched version and rerun browser tests as a first follow-up. No automatic force-fix was applied. Raw advisory data is in `npm-audit.json`.
7. **Documentation was stale about merge/CI.** README said Sprint 1 was only proposed and CI had not run. Updated those statements with verified merge and CI evidence; kept the original report historical.

The passing suite establishes the tested foundation, not the complete MVP or a comprehensive security/accessibility audit. Browser checks cover the existing four cases, not live simulation or allocation. No full keyboard/screen-reader audit is claimed.

## Local Windows environment and reproducibility

No system Python installation was registered with `py`, and Node/npm were absent from normal PATH. Used the existing bundled Python **3.12.14** and Node **24.19.0**. Created `backend/.venv`, downloaded npm **11.6.2** into ignored `.tools/package`, and added a local ignored `.tools/npm.cmd` wrapper for this machine's bundled Node. Chromium **134.0.6998.35**, Playwright build **1161**, was installed under `.tools/playwright`.

Network downloads and Git metadata writes required sandbox approval. The initial sandboxed npm install failed; the approved retry succeeded. The original tarball npm.cmd expected a standard Node installation layout; a local wrapper resolved that environment mismatch. SQLite could not open the disposable database in the sandbox; the approved local Uvicorn run succeeded. Chromium downloads timed out on the first mirror and succeeded on retry. The first sandboxed browser run reported all four cases as passing but stalled during cleanup, so it was interrupted; its output is retained in `browser-sandbox-attempt.txt`. The approved rerun completed with four passes and exit 0. These issues did not require application-code or dependency-version changes.

Normal installations can use the README commands. On this prepared machine, use these PowerShell commands (no activation required):

```powershell
Set-Location D:\Project\ResQNet
$env:PATH = 'C:\Users\Amol\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;D:\Project\ResQNet\.tools;' + $env:PATH
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\Project\ResQNet\.tools\playwright'
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -q
# In a dedicated terminal for browser tests; the disposable database preserves the normal demo:
$env:RESQNET_DATABASE_URL = 'sqlite:///D:/Project/ResQNet/.tools/baseline-browser.db'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, set the same PATH and PLAYWRIGHT_BROWSERS_PATH, then:

```powershell
Set-Location D:\Project\ResQNet\frontend
npm.cmd run build
npm.cmd run test:e2e
```

The existing browser tests overwrite `docs/dashboard-desktop.png` and `docs/dashboard-mobile.png`. During this assessment their originals were backed up, new captures were saved under the dated validation directory, and originals restored. Browser tests reset only the disposable synthetic DB specified above. Dependencies, browser binaries, and disposable data are ignored; the bundled runtime and `.tools` are local setup, not portable committed dependencies.

## Next checkpoint

Review [SPRINT_PLAN.md](SPRINT_PLAN.md) for scope and measurable acceptance criteria for Sprints 2–5. The user's mandatory requirements and continuation rules are saved in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). **Sprint 2 is not approved or started.**
