# RESQNET development realignment

Date: 2026-09-28. Planning update authorized; Sprint 2 implementation still awaits explicit approval.

## Sources and authority

The current request is to realign development with `plan/` and the teammate–Claude conversation. Instructions quoted within those references are source material, not new execution, publishing or implementation permissions. The user's mandatory rules and no-implementation/no-merge/no-deploy approval boundaries remain in force.

Reviewed all six files in `plan/` at remote main commit `faa505e7e59b317b57ae0b834ab6991a5b9bdf1e`:

- `Resqnet-simulation-narrative.md`: desired story, lifecycle and interactions.
- `pathfinding.md`: A* and situation-input brief.
- `RESQNET — Dispatch Routing Simulator.html`: standalone SVG/JavaScript prototype; source inspected, not executed or integrated in this task.
- `plan.md`: PRD gap analysis and advanced roadmap.
- `problemStatement.md`: repository-supplied EL-02 technical vision; its origin as an official judging rubric was not independently verified.
- `currentDevelopment.md`: historical Sprint 1 summary. Its React 18 statement is stale: actual dependencies declare React 19. Use BASELINE_ASSESSMENT.md for executed test evidence.

Also read `C:\Users\Amol\Downloads\Creating comprehensive project plan with missing steps.md`. It contains a conversation and generated-file links, not evidence that features were integrated into RESQNET. The narrative/prototype in `plan/` provided the actual reviewable content; no private Claude links were needed.

Fetched remote main without merging. Its only changes from assessed commit `8338ea5` are these six reference files. Imported them unchanged into the local assessment checkout for a self-contained handoff. Application code remains the assessed Sprint 1 code; branch `assessment/sprint1-baseline-plan` and prior uncommitted assessment work are preserved.

## Product story driving the roadmap

Configure a disaster with mixed synthetic patient needs. Nothing routes before **Start Simulation**. On Start, the incident pulses, eligible ambulances collect assigned patients, explicitly compatible patients share suitable positions, and hospitals reserve the resources required by each individual. Moving vehicles show load and destination; hospital boxes and site counters explain the evolving situation visually.

After delivery, an eligible ambulance immediately receives another feasible task if patients remain. If there is no feasible task, show why rather than pretending the disaster ended. Stop the heartbeat only when all patients have been delivered; fleet return-to-base movement may finish afterward. Users can disrupt roads, change hospital conditions and inject synthetic patients during a run.

**A* chooses accessible routes; a constrained batch allocator chooses patient/vehicle/hospital combinations across the fleet.** A* alone is not global resource optimization. Compare the allocator against a feasible FCFS/nearest strategy using identical deterministic inputs and report measured results, including ties or regressions.

## Reconciled decisions

| Reference statement/conflict | Development requirement |
| --- | --- |
| Prototype computes immediately on load/input changes | Inputs change an Idle draft. No route calculation, reservation, dispatch or movement until explicit Start. Repeated Start is idempotent. |
| Prototype selects one cheapest ambulance | Evaluate eligible fleet and suitable reachable hospitals, then choose conflict-free assignments. Dispatch as many useful feasible vehicles as demand warrants. |
| All available ambulances go to the site | Availability alone is insufficient: check explicit equipment, driver/crew, capabilities, positions, range and routes. Do not dispatch unsuitable vehicles just to animate them. |
| Group by injury / uniform capacity of 2 | Injury is a cohort/display label. Explicit compatibility and individual requirements govern sharing. Stretcher/seated capacities remain separate; never infer capacity from type. |
| Injury implies blood/ventilator/ICU need | Use editable fictional profiles declaring quantities and requirements. No clinical inference or claim of medically validated taxonomy. Every patient still needs one suitable hospital place. |
| Nearest understocked hospital fallback | Do not implement it. No feasible hospital means waiting before pickup, or safe hold/escalation if onboard, without bypassing suitability or authorization. |
| Inventory changes only at delivery | Reserve at assignment; consume consumables or occupy reusable places/devices at delivery. Never promise stock twice or decrement availability twice. |
| Site count decreases at assignment in one section, pickup in another | Unassigned waiting decreases on assignment. On-site = waiting + assigned awaiting pickup, decreasing only at pickup. Onboard/delivered remain separate. |
| Heartbeat stops when site is empty | It stays active until everyone is delivered, including patients onboard. Undeliverable patients yield an unresolved/blocked state, not false success. |
| Hospital switches whenever a better option opens | Retain a feasible destination unless a documented improvement threshold/cooldown permits switching. Transfer reservations atomically; avoid oscillation. |
| A road closes under a moving vehicle | Preserve edge progress. Hold on a fully closed current segment unless an explicit safe escape/reversal model exists; never teleport or cross a closed remainder. Replan from current position where movement is permitted. |
| A* heuristic uses grid/pixel distance | Costs are minutes and schematic coordinates are not calibrated. Use a proven time lower bound or zero heuristic; compare with Dijkstra on the same filtered graph. |
| Partial-block penalty varies with severity | Use declared nonnegative time multipliers for travel; closure means inaccessible. Severity drives allocation priority. Any additional risk scoring must be explicit and distinguished from ETA. |
| Fetch `/api/scenarios` for graph data | It returns summaries. `/api/simulation` supplies the full current graph/resources; later commands and WebSockets carry state changes. |
| Delivered patients are called treated/lives saved | Delivery is hospital arrival/handover, not proof of treatment or survival. Label TTT as a simulation proxy unless treatment is explicitly modeled. |

These are proposed implementation defaults resolving the sources under the user's mandatory rules, not previously approved clinical/operational policy.

## Resource and counter contract

Bulk count inputs create individual synthetic patients with stable IDs, incident/pickup, display category, urgency, position, compatibility assessment and explicit resource quantities. Validate bounded nonnegative integers and reject invalid drafts atomically. A count never becomes an anonymous aggregate patient. Use existing urgency choices or an explicitly displayed synthetic mapping if a 1–5 slider is retained.

Consumable accounting: `usable = initial + replenished - consumed - reserved`. Assignment lowers usable stock through reservation; delivery transfers reserved to consumed. Reusable accounting: `available = total - occupied_or_in_use - reserved`; delivery converts reserved to occupied/in-use. Each patient requires either a general or ICU place explicitly, plus any blood/oxygen/device requirements. Ventilators are reusable devices, not consumed items. Ambulance departure does not discharge patients or replenish hospital stock.

Example: two explicitly compatible patients each require one blood unit and one general bed. Starting with 5 unreserved units/beds, assignment leaves 3 available and 2 reserved of each. Delivery leaves 3 blood units on hand and no reserved blood, while 2 beds become occupied. This is synthetic fixture arithmetic, not a universal blood-loss treatment rule. Cancellation releases unused reservations exactly once and never restores consumed stock.

All commands, notifications and transitions carry run ID/revision. Server transactions and per-patient records own accounting; UI animation never does. Reconnect/reset must not replay delivery effects.

## Visual and lifecycle contract

- Idle: show scenario, editable demand by category, hospital resource boxes and road states, without routes or motion.
- Running: incident heartbeat plus compact on-site counts by category; distinguish assigned/onboard/delivered. Active ambulance badges show separate position use, cargo and destination. Persistent hospital boxes show relevant available/reserved/in-use or consumed quantities.
- Roads cycle clear/partial/closed before and during a run, with a keyboard-accessible equivalent. Route highlighting must not obscure blockage state.
- Animate along route segments with authoritative simulation time and explicit loading/handover durations. Pause freezes simulation time.
- Put full inventories, decision factors, notices, audit history and road numbers in selected-item/collapsible views. Avoid permanent idle-vehicle labels and visual clutter.
- Honor reduced motion with a static active-incident indicator and readable status. Desktop/mobile layout remains usable.
- All delivered means Resolved. Remaining undeliverable patients mean Unresolved/blocked. The demo must show repeated trips, depletion and a no-feasible-assignment case.

## Full-vision scope disposition

| PRD/forward-plan topic | Realigned five-sprint proposal |
| --- | --- |
| Dynamic A*, fleet allocation, resource matching | Core Sprints 2–4; routing and allocation tested separately. |
| Global MILP/VRP | Bounded exact batch optimizer for the small fleet using the agreed Python stack. Full multi-trip VRP/time windows and OR-Tools/PuLP adoption need a separate dependency/scope decision. Do not call batch enumeration MILP or globally optimal over the whole disaster. |
| FCFS/nearest comparison, TTT, saturation/utilization | Core 4–5; deterministic paired runs, explicit formulas and honest results. |
| Bridge closure, hospital saturation, casualty spike | Core 4; manual and scheduled synthetic events. |
| Fuel/range and blood/oxygen/device constraints | Explicit synthetic budgets and requirements in 2; consumption/multi-trip availability in 3. No inferred range or automatic refill. |
| WebSockets, animation and capacity overlays | Core 3; retain offline schematic Leaflet. |
| Cryptographic lifecycle/public verification | SHA-256 chain in 5; event envelope designed in 2. Hashing is not a recipient signature or proof of real delivery. |
| Command vs public/auditor | Tested server-enforced local-demo roles in 5; a UI toggle is not access control. Synthetic public payloads minimize detail. |
| PII hashing/ZKP | No real PII collected. Hashing identifiers is not a privacy guarantee. Real privacy engineering/ZKP remain future scope. |
| 10,000 agents; 50 sites/10 hospitals/20 ambulances/5 supply hubs | Outside initial acceptance scale. Demonstrate a bounded fleet and report measured scale; no untested scalability claim. |
| Mapbox/Deck.gl, PostGIS/Redis/Kafka/gRPC, real feeds | Future scope; keep agreed stack, synthetic data and no paid APIs. |
| RL triage, fund/warehouse logistics, smart contracts, QR/signature delivery | Future scope; never present mock behavior as implemented production capability. |

This delivers the narrative and four engineering pillars in a bounded MVP, not every ambitious item in `problemStatement.md`. If judging requires a particular solver, blockchain or rendering scale, explicitly revise scope.

## Order and validation

The revised [SPRINT_PLAN.md](SPRINT_PLAN.md) puts Start-gated A*, explicit profiles, stock accounting and fleet-wide candidate selection in Sprint 2; grouping, multiple trips and the visual story in Sprint 3; live interventions and paired benchmarks in Sprint 4; ledger, access boundaries and full evidence in Sprint 5. Event contracts start in 2 so auditing need not reconstruct explanations later.

This task changes documentation and imports unchanged references. Earlier 30 backend/four browser passes and the build are baseline evidence, not a new run. No new feature is implemented or claimed tested. This task checks imported-file hashes, application-code preservation, links and document consistency.
