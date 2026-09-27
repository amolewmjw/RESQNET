# RESQNET (EL-02) — Gap Analysis & Forward Plan

This plan compares the PRD (full vision) against what Sprint 1 actually shipped, then lays out the remaining work — including the "advanced" features the PRD emphasizes (optimization engine, dynamic graph, ledger, real-time viz) — as a phased roadmap.

---

## 1. Where Things Stand: PRD vs. Sprint 1

| PRD Pillar | PRD Ask | Sprint 1 Reality | Gap |
| --- | --- | --- | --- |
| Optimization Engine | MILP / VRP with time windows, dynamic re-balancing, multi-agent RL / triage prioritization | Not started — only `interfaces.py` stubs future allocation service | **Full engine missing** |
| Dynamic Graph | Time-varying edge weights, Dijkstra/A* with live blockage/traffic updates | Static NetworkX graph (9 nodes, 12 roads), no pathfinding, no time-varying weights | **Pathfinding + dynamic weights missing** |
| Resource Constraints | ICU/O2/blood capacity constraints, ambulance fuel/equipment matching solved via optimizer | Data modeled (ambulance/hospital attributes, capacities) but not consumed by any solver | **Constraint logic missing** |
| Ledger / Audit Trail | Smart contracts or cryptographic ledger, 4-stage event lifecycle, ZKP/hash-based PHI masking, public verification portal | Not started | **Entire pillar missing** |
| RBAC / Privacy | Role-based views, PHI/PII masking | Not started (single unauthenticated API surface) | **Missing** |
| Real-Time Viz | Deck.gl/Mapbox, WebSockets/gRPC push, 10k+ agent rendering, live rerouting | React Leaflet **offline schematic map**, no WebSockets, static REST fetch only | **Real-time layer + real map missing** |
| Event Injection | Bridge collapse, hospital saturation, mass casualty event triggers | Only static seed scenarios (Flood/Collapse/Gas Leak), no runtime event injection | **Missing** |
| Benchmarking | Static baseline vs. EL-02 solver, TTT / overcrowding / utilization metrics | No baseline algorithm, no metrics computed | **Missing** |
| Testing/Foundation | — | 30 pytest + 4 Playwright tests passing, atomic resets, strict schema | ✅ Solid, ahead of schedule |

**Bottom line:** Sprint 1 built a correct, well-tested *data and scaffolding layer*. All four PRD engineering pillars (Optimization, Ledger, Real-Time Viz, Dynamic Graph) are still greenfield. That's expected for Sprint 1 but means Sprint 2+ carries the bulk of "hackathon-impressive" work.

---

## 2. Roadmap (Phases 2–5, aligned to PRD's 4-phase diagram)

### Phase 2 — Dynamic Graph & Optimization Engine (core differentiator)
**Goal:** Prove the "global optimization beats FCFS/nearest-hospital" claim.

- [ ] Implement pathfinding on `app/graph.py`: Dijkstra baseline, then A* with heuristic (haversine/grid distance).
- [ ] Make edges time-varying: `W(t)` updated by hazard zones (existing `hazard_zones` table already has the data needed — wire it in).
- [ ] Build event injector service: bridge collapse (edge weight → ∞), hospital saturation (capacity → 0), mass casualty spike (batch patient injection) — matches PRD Phase 1 Events A/B/C.
- [ ] Implement the objective function from PRD §2.1 using **OR-Tools or PuLP**:
  - Decision variables: patient→hospital assignment, ambulance→patient dispatch.
  - Constraints: `Σ Allocated_j(t) ≤ Capacity_j(t)`, ALS/BLS equipment matching, fuel/range limits.
  - Weighted objective: `w1·T_ij(t)·S_i + w2·C_j(t) + w3·D_k(t)`.
- [ ] Build **Static Baseline** allocator (nearest-hospital + FCFS) as a comparison strategy — needed for Phase 2 benchmarking, not just the smart one.
- [ ] Metrics module: Average Time to Treatment, Hospital Overcrowding Index, Resource Utilization %.
- [ ] Expose `/api/simulate/step` or similar to advance the sim tick-by-tick and re-run the solver.

*Stretch:* multi-agent RL prioritization layer on top of MILP for triage — likely out of scope for hackathon timeline; flag as "future work" in the writeup rather than building it, unless time allows.

### Phase 3 — Transparent Ledger & Audit Trail
**Goal:** Tamper-evident logging of the 4-stage lifecycle, without needing a real blockchain deployment.

- [ ] Pick a lightweight approach for hackathon scope: an **append-only hash-chained table** (each row stores `hash(prev_hash + payload)`) is realistic to build in the time available; reserve actual Solidity/Hyperledger for "production roadmap" slides unless a team member has blockchain experience.
- [ ] Implement event lifecycle: `ResourceRequested → AllocationCommitted → InTransit → ResourceDelivered`, each emitting a signed/hashed ledger entry.
- [ ] Add RBAC middleware: at minimum two roles (Public/Auditor read-only aggregate view vs. Command-post read/write).
- [ ] Mask PHI: hash patient identifiers before they hit any public-facing endpoint; keep raw PII only in the internal `patients` table.
- [ ] Build a minimal **public verification page** (or API endpoint) that lets anyone recompute the hash chain and confirm no tampering — this is a strong, demoable "wow" feature relative to effort.

### Phase 4 — Real-Time Visualization
**Goal:** Replace static fetch + offline schematic with live, spatial, streaming UI.

- [ ] Add WebSocket endpoint (FastAPI supports natively) broadcasting allocation/reroute/capacity events.
- [ ] Frontend: subscribe via WebSocket, push updates into `SimulationContext` instead of polling.
- [ ] Decide map strategy given hackathon constraints:
  - If offline/synthetic map is a hard requirement (as Sprint 1 chose) → enhance Leaflet with animated markers, route polylines, hazard overlays, capacity-colored hospital pins.
  - If real basemap is wanted and internet access is fine for judges → swap to Mapbox GL JS / Deck.gl per PRD, with 10k-agent rendering as a stretch goal (likely unnecessary at hackathon scale — a few dozen agents animated well will read better than an unstyled 10k-point cloud).
- [ ] Add live audit feed panel (reads from Phase 3's ledger) and capacity gauges (ICU/blood/O2) driven by the solver's live state.

### Phase 5 — Integration, Benchmarking & Demo Polish
- [ ] Wire optimization engine output → WebSocket broadcast → map/audit feed, so a single simulation tick visibly updates routes, capacity gauges, and the ledger together.
- [ ] Run the three PRD disaster scenarios end-to-end with both allocators (baseline vs. EL-02) and produce comparison charts (TTT, overcrowding, utilization) for the pitch deck.
- [ ] Extend automated tests: solver correctness (constraint satisfaction), ledger tamper-detection test, WebSocket integration test.
- [ ] Prepare the demo script: seed scenario → inject Event A/B/C live → show solver re-routing in real time → show ledger recording each delivery → show public verification catching a tampered record.

---

## 3. Priority Call for Limited Hackathon Time

If time is scarce, rank by demo impact vs. effort:

1. **Dynamic solver + baseline comparison with live metrics** (Phase 2) — this is the PRD's core technical claim; without it, the project is "just a dashboard."
2. **WebSocket live updates + animated map** (Phase 4, offline-map version) — turns a static CRUD app into something that visibly reacts, which reads well in a demo.
3. **Hash-chained ledger + public verification** (Phase 3, lightweight version) — high "wow per hour invested," doesn't require real blockchain tooling.
4. Everything else (real Mapbox basemap, RL prioritization, gRPC, Zero-Knowledge Proofs, 10k-agent rendering) — list as "Future Work / Production Roadmap" in the submission rather than building, unless Phases 2–4 finish early.

---

## 4. Open Questions to Resolve Before Sprint 2 Kickoff

- Solver choice: OR-Tools CP-SAT vs. PuLP/CBC — depends on constraint complexity and team's familiarity; OR-Tools is faster to prototype VRP-style problems.
- Ledger fidelity: is a real blockchain a judging criterion, or is "tamper-evident" sufficient? This changes Phase 3 scope drastically.
- Map fidelity: is judges' expectation "real Mapbox with 10k agents" (as PRD literally states) or is the offline schematic map (Sprint 1's actual choice) acceptable? This should be confirmed early since it affects Phase 4 effort significantly.
- Do we keep RBAC/ZKP as real auth, or a demo-only toggle between "Public view" and "Command view"?