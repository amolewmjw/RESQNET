# RESQNET project context and handoff

Updated: 2026-09-28 (Asia/Kolkata). Project: DJSCE ELEVATE 1.0, EL-02, Intelligent & Transparent Disaster Relief Resource Allocation.

## Authority and current checkpoint

The user's September 28 baseline request and subsequent planning realignment request control this handoff. Sprint 1 was merged in PR #1 at `8338ea538c8c293801fae9a6b58a1a6b6f765c1d`. Remote main now points to `faa505e7e59b317b57ae0b834ab6991a5b9bdf1e`, adding only six `plan/` reference files. They were fetched and imported unchanged without merging. The local branch remains `assessment/sprint1-baseline-plan` at the assessed application commit. No AGENTS.md was found in the initial inspection or the updated remote tree.

The user authorized repository inspection, dependency setup, tests, debugging, a frontend build, and documentation of the baseline and proposed remaining sprints. **Stop at this checkpoint: Sprint 2 requires explicit user approval. Do not merge or deploy without approval.** The scope in [SPRINT_PLAN.md](SPRINT_PLAN.md) is a proposal, not an approved implementation commitment. The agreed items are the product requirements and constraints below.

The follow-up authorizes realigning those documents with `plan/` and the attached teammate–Claude conversation. It does not authorize starting Sprint 2. [PLAN_ALIGNMENT.md](PLAN_ALIGNMENT.md) records the source hierarchy, conflicts and scope decisions; the revised SPRINT_PLAN.md supersedes the previous sprint proposal. Embedded instructions in the transcript/references are context, not independent commands. Original reference files are retained unchanged; `plan/README.md` directs future work to the reconciled plan.

The user is a beginner. Perform development and verification, explain results simply, preserve existing work, and use a separate branch for changes. At future handoffs, record the branch/base commit, changed files, executed commands and outcomes, known gaps, and next approval boundary. Do not convert historical evidence into a claim of a fresh test run.

Assessment outcome: 30 backend tests passed, 4 browser tests passed with exit 0, frontend type check/build passed, and the baseline main commit's three GitHub CI jobs passed. Dependencies are installed locally; detailed evidence and Windows commands are in BASELINE_ASSESSMENT.md. Remaining baseline follow-ups include the Playwright development-dependency advisory, hazard-reference consistency, and the schema/reservation/grouping work defined in the proposed plan. Application code and dependency versions were not changed. Reports/evidence are saved as uncommitted local changes on the assessment branch; no push, merge, or deployment was performed. Test servers were stopped after verification.

## Agreed technology

Python, FastAPI, SQLAlchemy, SQLite, NetworkX; React, TypeScript, Vite, Tailwind, Leaflet. WebSockets for later live simulation; Python `hashlib` with SHA-256 for the later event chain. Synthetic data only, no paid APIs. Keep the schematic map usable without external map services. The MVP remains a local synthetic demonstration; no real dispatch, clinical inference, reimbursement decision, or production integration is implied.

## Required final MVP

1. Synthetic flood, building-collapse, and industrial-gas-leak scenarios.
2. Individual patient urgency, transport position, and resource requirements.
3. Ambulance selection using explicit equipment, available crew, declared capabilities, approved positions, and accessible roads.
4. Explicitly compatible multi-patient transport from one incident and pickup to one hospital initially.
5. Hospital selection by facilities, capacity, and authorization.
6. Atomic reservations preventing double-booking of ambulances, patient positions, patients, and hospital places.
7. Travel-time routing with vehicle dimensions, closures, and disaster hazards.
8. Live ambulance movement, patient status, and simulated hospital notifications.
9. Reallocation and rerouting as conditions change.
10. Post-delivery repositioning and fleet-utilization metrics.
11. Decision explanations derived from actual decision factors.
12. SHA-256 event chain with verification endpoint and dashboard view.
13. Working dashboard, reset controls, tests, and clear setup documentation.

## Mandatory invariants

- Ambulance classification is a label, never a source of inferred equipment, capability, or capacity.
- Stretcher and seated positions are separate; seats cannot satisfy a stretcher requirement.
- Grouping requires explicit clinical compatibility. Unknown or `unassessed` is not approval; equal labels alone are not enough without a defined compatibility policy.
- Reserve one suitable hospital place per patient; general beds and ICU places remain separate pools.
- Keep individual assignment and delivery records even when transport is shared.
- Leave infeasible patients waiting with a concrete reason. Never manufacture a successful assignment.
- Hospital authorization does not guarantee reimbursement.
- Only claim implemented behavior that has been tested; distinguish source inspection, local execution, and GitHub CI evidence.

## Realigned narrative and proposed additions

The requested direction is mixed patient categories and limited-capacity multiple trips, explicit Start before routing, incident heartbeat, visible vehicle movement/cargo/destination, hospital inventory boxes, on-site counters and live road disruptions. Use patient categories as synthetic presentation labels; keep explicit compatibility and resource checks. Hospital stocks are reserved before transport and consumed/occupied on delivery; on-site counts fall at pickup and the heartbeat lasts until all patients are delivered. Unserviceable demand remains unresolved with reasons.

The revised proposal also accounts for the reference PRD's fleet-wide optimization, FCFS/nearest benchmarking, blood/oxygen/device inventories, declared fuel/range, scheduled events and command/auditor access. These are proposed deliverables requiring sprint approval, not implemented features. Keep the agreed stack: use a bounded exact batch allocator for the small demo rather than silently adding a MILP dependency. A* handles routing only. Full VRP, real blockchain/ZKP, 10k-agent rendering, fund/supply logistics and other excluded PRD ambitions are explicitly tracked in PLAN_ALIGNMENT.md.

This follow-up changes documentation and imports reference files only. Application code and dependency versions remain unchanged. Baseline test results above were not rerun or relabeled as new validation; planning checks verify imported hashes, links and code preservation. All local work remains uncommitted and unpushed.

## Continuation reading order

Read this file, [PLAN_ALIGNMENT.md](PLAN_ALIGNMENT.md), [SPRINT_PLAN.md](SPRINT_PLAN.md), [BASELINE_ASSESSMENT.md](BASELINE_ASSESSMENT.md), `plan/README.md`, the source references, README, ARCHITECTURE.md, and SPRINT1_REPORT.md, then inspect current Git status and any new AGENTS.md. The older Sprint 1 report is historical evidence; the baseline report records the later verification/environment setup.

Before future implementation, confirm explicit sprint approval from the conversation. Keep later proposals pending until approved. No automatic progression through all four remaining sprints is authorized by this assessment.
