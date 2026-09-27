# Realigned Sprint 2–5 development plan

Updated 2026-09-28 against `plan/` and the teammate–Claude conversation. **Proposed implementation scope; explicit Sprint 2 approval still required.** Sprint 1 remains the verified foundation. Five total sprints; each ends with a tested demonstration, updated documentation and user review. No automatic progression, merge or deployment.

Read [PLAN_ALIGNMENT.md](PLAN_ALIGNMENT.md) for provenance, conflict resolutions, inventory equations and PRD exclusions. Preserve every invariant in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). The acceptance criteria below are proposals, not permission to begin implementation.

## Sprint 2 — Start-gated A*, fleet allocation and reservations

Outcome: configure mixed synthetic patient needs, press Start, and see feasible fleet assignments, reserved hospital resources, accessible routes and actual decision factors. This sprint displays static assigned routes after Start; motion comes in Sprint 3.

Work:

1. Address the baseline Playwright advisory with a reviewed patched dependency and rerun tests/audit. Reconcile R04/R10 hazard references with the drawn polygons before routing.
2. Add versioned schema migration, run/revision identity, lifecycle states, individual assignments, trips and reservations. Preserve existing databases with backup/recovery; `create_all()` cannot alter existing constraints.
3. Add category/count inputs that expand into individual synthetic patients. Explicitly declare urgency, position, compatibility status, equipment/crew quantities, hospital-place type and blood/oxygen/device requirements. Add hospital consumable/reusable inventory and explicit synthetic fleet fuel/range budgets. Labels do not supply missing attributes.
4. Implement server-side NetworkX A* for ambulance → pickup and pickup → suitable hospital. Filter closures, hazards, class, width/height and applicable length restrictions. Partial blockages use declared time multipliers. Use a proven time lower bound or zero heuristic, never raw schematic pixels as minutes. Return distance, time and decision score separately.
5. Generate feasible patient/ambulance/hospital candidates, then choose a conflict-free fleet allocation. Proposed small-scale method: deterministic exact enumeration/branch-and-bound maximizing served critical, then urgent, then stable patients, then minimizing total travel time with stable ID ties. Bound workload and report solver limits/status; never claim optimality after timeout. This is batch optimization, not full-disaster VRP/MILP. Add a feasible FCFS/nearest strategy through the same interface for comparison later.
6. Atomically reserve a vehicle, correct position, resources and one suitable hospital place per patient. Proposed authorization policy admits government and explicitly authorized private hospitals; exclude non-authorized candidates with a reason. Store actual selection/rejection factors and event envelopes (`ResourceRequested`, `AllocationCommitted`, rejection/release) with state changes. Hashing is deferred to 5.
7. Add Start/reset, demand preview, static routes, resource boxes and assignment/waiting results. Idle edits never compute routes or reserve anything. Repeated Start is idempotent; reset returns to Idle.

Acceptance:

- Each disaster produces deterministic feasible assignments or specific waiting reasons after Start. Idle load/input/reset yields zero route searches/reservations. Invalid or excessive counts fail atomically; valid counts create stable individual IDs.
- Independently missing equipment, available driver/crew, declared capability, correct position, range, hospital facility, authorization or stock rejects the candidate. Type changes cannot supply resources. Seats cannot replace stretchers; ICU/general places cannot substitute implicitly.
- A* matches Dijkstra cost on the same filtered graph, including partial/full blockages, disconnected routes, hazards and dimension boundaries. Both legs and range budgets are checked; ETA equals summed time costs.
- A resource-contention fixture demonstrates the batch allocator outperforming greedy nearest on its declared objective; exhaustive tiny cases verify the objective and constraints. Do not claim survival benefit or whole-disaster optimality.
- Independent sessions/service instances competing for the last patient/vehicle/position/hospital resource cannot both reserve it. Injected failure rolls back all effects; repeated commands, stale revisions and reset races are safe.
- Accounting follows PLAN_ALIGNMENT.md: no understocked fallback, double promise, negative stock or patient without a suitable place. Unassessed fixtures remain single-patient trips.
- Migration/restart preserve state. Baseline/new backend and browser tests, frontend build and CI pass. Explanations match persisted factors.

Boundary: one patient per trip, static post-Start routes. Data is ready for grouping, but no animation or grouped transport is claimed yet.

## Sprint 3 — Grouped, animated, multi-trip disaster response

Outcome: the core visual story works: heartbeat, moving vehicles, cargo badges, persistent hospital inventories and repeated trips until delivered or visibly blocked.

Work:

1. Generate group candidates only for explicitly compatible patients at the same incident/pickup, initially to one hospital. Category organizes/display cohorts; it is not compatibility proof. Aggregate exclusive requirements and require explicit sharing limits. Preserve per-patient records.
2. Add a deterministic server clock and Start/pause/resume/step/reset. Vehicle lifecycle: assigned → travelling to pickup → loading → onboard/travelling to hospital → handover → delivered → reassignment or return/staging. Persist timestamps, edge progress, range consumption and individual delivery records.
3. Stream committed revisions by WebSocket; React/Leaflet interpolates between authoritative positions. Reconnect gets a snapshot and discards old-run/out-of-order messages.
4. On-site = unassigned + assigned awaiting pickup; reduce it only on pickup. Show onboard/delivered separately. Keep heartbeat active until every patient is delivered; show unresolved/blocked when none can be served.
5. Display active vehicle stretcher/seated use, cargo and destination; site counts by category; hospital available/reserved/in-use/consumed resources. Keep detailed factors, simulated hospital incoming/arrival notices and logs in selected-item/collapsible views. Send no real hospital messages.
6. Delivery transfers reservations exactly once to consumption or occupancy and releases vehicle resources appropriately. Immediately allocate another feasible waiting group from the hospital location; otherwise explain idle/blocked/return state. No automatic fuel refill, patient discharge or stock replenishment.

Acceptance:

- Compatible same-pickup patients can share a suitable vehicle/hospital. Different incident/pickup, unknown/incompatible assessment or insufficient concurrent resources/positions/places forces separate transport or waiting. Group filling cannot delay a feasible higher-priority patient.
- A seeded scenario with demand beyond fleet capacity completes multiple trips with separate patient histories; a shortage scenario stays unresolved with reasons. Dispatch only feasible useful vehicles, without a universal capacity assumption.
- Assignment lowers unassigned waiting but not on-site count; pickup lowers on-site; delivery completes individual records. Heartbeat persists when the site is empty but a patient remains onboard.
- Reservation → consumption/occupancy conserves every resource; other vehicles cannot take committed stock. Large/repeated ticks and reconnect do not duplicate delivery or decrement twice. Loading/handover durations are explicit.
- Range budgets decrease over repeated trips and can cause waiting. Return/staging needs accessible roads and sufficient range; inability to return is visible.
- Browser tests show segment movement, cargo/destination changes, live counters/inventories and notices. Two clients converge; pause freezes time; restart recovery and reset cancellation of old-run work are tested.
- Mobile/desktop remain readable; keyboard controls and reduced-motion behavior work. Backend/browser regressions, build and CI pass.

## Sprint 4 — Live interventions, reallocation and comparative metrics

Outcome: close a road under an active route and see a valid response; hospital changes/new patients alter decisions; benchmark the strategies fairly.

Work:

1. Enable clear/partial/closed road editing during a run, with a keyboard-accessible equivalent. Add manual and scheduled bridge closure, hospital saturation/stock updates and new patient-batch events. Validate and sequence events deterministically before the next decision/tick.
2. Reroute affected journeys from actual edge position/progress. Use a virtual current-position node where movement is permitted; a fully closed current edge requires holding unless the fixture declares safe escape/reversal. Never teleport, start again at origin or traverse the prohibited remainder.
3. Reallocate pre-pickup tasks after fleet/crew/resource changes; retain patient–vehicle linkage onboard. Preserve feasible hospital destinations unless a documented threshold/cooldown permits change. Atomically transfer reservations after rechecking every requirement.
4. Finish repositioning policy: feasible waiting demand first, otherwise accessible declared staging/home. Record idle, unavailable, inbound, loaded travel, handover and repositioning time separately.
5. Run dynamic and feasible FCFS/nearest strategies on independent copies of identical seeds, demand and event schedules. Baseline obeys the same hard safety/capacity constraints and handles unsafe roads; document which allocation decisions it does not reoptimize. Comparison must not mutate the interactive run.
6. Report delivered/waiting counts, severity breakdown, arrival/handover proxy for TTT, defined saturation/overcrowding, utilization, trips and distance. Include undelivered patients so averages do not hide shortages. Hard bounds should keep true overcapacity zero; compare saturation duration/queues instead of inventing overcrowding.

Acceptance:

- Mid-trip partial/full changes produce accessible detours or visible holds without position jumps, on both journey legs. Unrelated closures affect later decisions without unnecessary route changes.
- Hospital capacity cannot be silently reduced below commitments. Reject invalid administrative changes or apply a documented atomic disruption/reallocation policy; preserve nonnegative counts/history.
- Repeated interventions cannot duplicate reservations/deliveries or lose onboard patients. Destination changes obey the tested threshold/cooldown with concrete reasons.
- Scheduled bridge/hospital/casualty events fire once at deterministic times; new individual patients appear in counters and extend unresolved status. Invalid events leave state intact.
- All three disasters have intervention tests, including resource conservation, delayed events, pause/reset races and reconnect.
- Hand-calculated runs match metric formulas. Paused time is excluded and unavailable fleet treatment explicit. Paired results record seed, policies and event history; report ties/regressions without claiming universal superiority.
- Comparative charts, intervention UI and repositioning are demonstrated; regressions, build and CI pass.

## Sprint 5 — Verifiable history, access boundaries and final demo

Outcome: demonstrate the narrative, measured allocation behavior and tamper-evident history together with reproducible setup.

Work:

1. Hash canonical events using `hashlib.sha256`: sequence, run ID, type, simulation time, payload/factors and previous hash. State and event commit together. Cover requests, allocation/rejection, pickup/InTransit, delivery, releases, interventions, reroutes, repositioning and resets.
2. Add verification endpoint and collapsible ledger view with the first failure position, exported expected head/count checkpoint and retained prior-run history. A hash chain is not blockchain consensus, a recipient signature or proof of real-world delivery.
3. Add server-enforced local-demo command vs read-only public/auditor roles for REST and WebSockets; secrets stay outside source. Public outputs expose aggregates/explicitly public synthetic audit data. UI toggles alone are not authorization; hashing patient IDs alone is not privacy. Collect no real PII.
4. Script full demonstrations for all three disasters: mixed profiles, compatible groups, repeated trips, resource depletion, infeasible waiting, manual/scheduled changes, rerouting, metrics and ledger verification. Include a fair baseline comparison and measured limitations.
5. Update Windows setup, architecture, schema/API exports, demo script, test evidence and handoff. Keep PRD exclusions/substitutions visible in the submission.

Acceptance:

- Clean chains verify after restart. Payload/hash/link edits, interior deletion, reordering and broken sequence fail correctly. Detect suffix truncation against an independently retained checkpoint; never claim a rewritten bare chain detects privileged rewriting.
- Concurrent writers and injected state failures preserve order and atomicity. Reset retains/verifiably links history; stale runs cannot append misleading current events.
- Anonymous/read-only callers cannot mutate state; test REST/WebSocket authorization and public payloads. Document local-demo credentials and threat-model limits.
- Demonstrations retain per-patient assignment/delivery records and actual factors, with no unsupported treated/lives-saved/global-optimality/10k-agent claims.
- Fresh documented setup, full backend/browser tests, type check/build and CI pass. Check runtime offline after installation, mobile/desktop, recovery/reset and absence of paid API dependencies.
- Final report lists implemented behavior, demonstrated scale, benchmark outcomes and exclusions. Present for review; no automatic merge or deployment.

## Coverage and limits

| Requirement/source | Sprint |
| --- | --- |
| Original scenarios and individual resource models | 1; explicit richer profiles in 2 |
| A*, situation inputs, Start gating, fleet selection, reservations, explanations | 2 |
| Compatible groups, motion, heartbeat, site/hospital boxes | 3 |
| Multi-trip reassignment, individual delivery, WebSockets/notifications | 3 |
| Live closure/rerouting, hospital changes and casualty injection | 4 |
| Repositioning/utilization, paired FCFS comparison | 3–4; final evidence in 5 |
| Event lifecycle, SHA-256 verification and access boundaries | Contract in 2; chain/access in 5 |
| Reset, tests, actual explanations, documentation | Every sprint |

Retain Python/FastAPI/SQLAlchemy/SQLite/NetworkX and React/TypeScript/Vite/Tailwind/Leaflet, plus WebSockets and SHA-256. Full VRP/time windows, large-scale MILP, RL, real feeds, smart contracts, ZKP, fund/supply-hub logistics, Mapbox/Deck.gl and 10k-agent rendering remain future scope, not silently completed requirements. See PLAN_ALIGNMENT.md for full disposition and unresolved judging-scope limits.
