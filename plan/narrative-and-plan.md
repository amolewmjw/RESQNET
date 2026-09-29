# RESQNET — Disaster Response Simulation
## Narrative & Interaction Specification

This document is the story we are building toward and the behavior we want the simulation to demonstrate. It is written to lock down the *what and why* before any implementation changes are made to the prototype.

---

## 1. The Pitch: What Story Are We Telling?

Most disaster-allocation demos cheat. They show one ambulance carrying one patient to one hospital, and the "intelligence" is just picking the nearest hospital. That is not what a real disaster looks like, and it is not what makes an optimization engine worth building.

A real mass-casualty event produces a **mixed population of injuries arriving all at once**, more victims than any single vehicle can move, and hospitals that are each good at treating some things and not others. The interesting problem — the one worth showing a judge — is:

> *Given N victims of different injury types at one site, K ambulances of limited capacity, and M hospitals each with different, depleting inventories, who goes where, in what order, in what groupings, and why?*

RESQNET's simulation should make that problem **visible and legible in real time**: victims sorted by what they need, ambulances making repeated runs because they physically cannot clear the site in one trip, hospitals filling up and running low on specific supplies as deliveries land, and — critically — the system re-routing itself live when the ground truth changes (a road goes down mid-transit).

This is the demonstration of the PRD's core claim: a **global, dynamic, transparent** allocator beats "nearest hospital, first-come-first-served" — and the viewer should be able to *watch* why, not just be told.

---

## 2. Victim Taxonomy & Grouping Logic

### 2.1 Injury types
Grounded in RESQNET's three existing disaster scenarios (Flood, Building Collapse, Industrial Gas Leak), victims at an incident site are not a single undifferentiated count — they are a mix of injury categories, each of which maps to a different hospital resource:

| Injury type | Hospital resource it consumes | Typically dominant in |
| --- | --- | --- |
| Blood loss / hemorrhage | Blood bank units | Building collapse, flood (debris trauma) |
| Fracture / orthopedic | General beds / ortho capacity | Building collapse, flood |
| Limb loss / amputation | ICU beds + blood bank | Building collapse |
| Unconsciousness / head trauma | ICU beds + ventilators | Building collapse, flood |
| Smoke/gas inhalation, respiratory distress | Ventilators | Industrial gas leak |
| Crush injury (internal bleeding) | ICU beds + blood bank | Building collapse |

A single incident does **not** produce one uniform group — it produces several groups of different sizes and different needs simultaneously. This is the realism upgrade: "5 patients" becomes, for example, "2 blood-loss, 1 fracture, 1 unconscious, 1 respiratory," and each of those sub-groups has a different ideal hospital.

### 2.2 Why grouping matters
Grouping victims by injury type before dispatch (rather than by arbitrary batches of 5) means:
- An ambulance carrying blood-loss victims should be routed to whichever reachable hospital actually has blood bank stock — not just the nearest one.
- A hospital with zero ICU beds should never receive an unconscious/critical victim if a farther hospital with ICU capacity is reachable in comparable time.
- The system's "intelligence" becomes visible as *matching*, not just *routing* — this is the difference the pitch needs to sell.

### 2.3 Multi-trip reality
An ambulance has a fixed carrying capacity (e.g., 2 patients). If the incident produces 10 limb-loss victims, **one ambulance cannot clear them** — this must visibly require multiple ambulances and/or multiple round trips, exactly as it would in a real disaster:
- All available ambulances are called to the scene when victim count exceeds what already-dispatched vehicles can carry.
- As soon as an ambulance delivers its load and becomes free, if victims remain on-site, it is **reassigned back to the incident** rather than idling — the loop closes until every victim is cleared.
- This reassignment behavior is itself a visible proof point: it's what "dynamic" means in the PRD, not a one-shot batch assignment.

---

## 3. Simulation Lifecycle (State Machine)

### 3.1 Global state
- **Idle** — map is shown, no routing has happened, nothing is animating. Roads can be pre-configured but nothing is "live" yet.
- **Start Simulation** (explicit trigger button) — this is the only way the simulation begins. Nothing routes before this is pressed.
- **Running** — the full loop below executes until every victim group has been delivered.
- **Resolved** — all victims cleared; site indicator stops; final summary state is shown (all hospitals' remaining inventory, total time elapsed, total trips made).

### 3.2 Incident site behavior
- The moment Start Simulation is pressed, the disaster site begins a **pulsing / heartbeat visual** (a glow or ring animation that expands and fades on a loop) — a persistent "this is live and urgent" signal.
- The heartbeat continues for as long as **any victim remains on-site, waiting, or not yet delivered** — including victims still waiting for an ambulance to become free.
- The heartbeat stops only when the last victim group has been delivered to a hospital.
- A small always-visible counter is anchored at the site showing **victims remaining, broken down by injury type** (e.g., "Blood loss: 2 · Fracture: 1 · Unconscious: 0"). This number updates the instant a group is picked up (decremented) — not when it arrives at the hospital.

### 3.3 Ambulance lifecycle (per vehicle)
1. **Idle at base** — parked at its home node, not yet called.
2. **Called / assigned** — the moment victims exceed current capacity in transit, this ambulance is activated and assigned a victim group (by injury type) it will collect.
3. **En route to incident** — the ambulance animates along its computed shortest path (A*) toward the incident, moving progressively along the route rather than jumping.
4. **Loading** — brief pause at the incident representing pickup; the assigned victim group is now "aboard," and the site's remaining-victim counter drops.
5. **En route to hospital** — animates along its computed path to the hospital chosen for this specific cargo (based on which reachable hospital has the needed resource). If the assigned hospital selection changes because of a road block encountered mid-transit (see §4), the path updates live but the destination hospital itself only changes if the original becomes unreachable or a strictly better option opens up — the vehicle should not visibly "waffle."
6. **Delivering** — brief pause at the hospital; the hospital's relevant inventory is decremented by the delivered count (see §5).
7. **Reassignment check** — instantly after delivering, the ambulance asks: *are there still victims waiting on-site?* If yes, it goes back to step 2 (routed back to the incident for another group). If no, it returns to **Idle at base** (or waits near the incident if that's operationally more realistic — worth a small design decision later, but default to returning to base).

### 3.4 Victim group lifecycle
- **Waiting at site** — counted in the site's remaining-victim box, grouped by type.
- **Assigned** — claimed by a specific ambulance; removed from the "waiting" count the instant assignment happens (not on delivery), since it's no longer available for a different ambulance to pick up.
- **In transit** — visually attached to its ambulance (see §4.3, cargo label).
- **Delivered** — counted against the destination hospital's inventory; contributes to the running "victims treated" total.

---

## 4. Real-Time Visual Requirements

The guiding principle: **show the state of the world, not paragraphs about it.** Every important fact should be a small always-visible element near the thing it describes, not a sidebar of text. Avoid overloading the screen — only the following elements are "always on":

### 4.1 Disaster site
- Pulsing/heartbeat marker, active only while unresolved victims remain.
- Small floating counter box: remaining victims by type.

### 4.2 Hospitals
- Each hospital gets a persistent small inventory box (not a hover-only tooltip) showing its current stock of each relevant resource (ICU beds, blood units, ventilators), live-updating the instant a delivery lands. This directly answers "why was this hospital chosen and that one wasn't" — the viewer can see the numbers change and see a depleted hospital get skipped on the next assignment.

### 4.3 Ambulances
- Each moving ambulance shows a compact label or badge: **capacity (e.g., 2/2 occupied), cargo type(s) currently aboard, and current destination** (incident or a named hospital). This label should be minimal — a few characters/icons, not a paragraph — and only visible while the ambulance is active (idle ambulances at base don't need to clutter the view).
- Ambulances physically move along their path node-by-node/segment-by-segment rather than jumping, so the viewer can watch the journey and watch a re-route happen visibly if a block occurs mid-trip.

### 4.4 Roads
- Blockage state (clear / partial / fully blocked) remains visually encoded on the road itself (as in the current prototype), and remains clickable **during a running simulation**, not just before it starts.

### 4.4a The Live Decision Dashboard (second wow factor)
Alongside the map, a separate persistent panel logs every dispatch decision as it happens, in plain, timestamped, one-line entries — e.g. *"Ambulance A3 dispatched — assigned Patients #02, #06 (Blood loss). Route via J2→J3. Reason: nearest ambulance, clearest path."* and *"Ambulance A3 delivered to H3. H3 blood stock: 3 → 1."* A snapshot line is also appended once per simulated minute even with no new decision, so the feed is always live. This is the map's narrative counterpart: the map shows *what* is happening spatially, the dashboard shows *why* it happened, in order, as an append-only record — effectively standing in for the PRD's "transparent audit trail" pillar without needing a real ledger. Full log-line format and cadence rules are in `plan-v2.md` §4.4.

### 4.5 What we deliberately do NOT show persistently
- No constant text log/feed cluttering the screen — if an event log is wanted, it should be a small collapsible strip, not competing for attention with the map.
- No numeric overlays on every single road (only blockage state, not raw distance/cost numbers, unless the user hovers).
- No permanent labels on idle/unused ambulances.

This restraint is intentional: the pitch works because a judge can glance at the screen and *get it* — heartbeat at the disaster, boxes filling/draining at hospitals, ambulances visibly shuttling back and forth — not because every number is printed at once.

---

## 5. Live Re-Routing During an Active Simulation

This is the centerpiece interactive moment and must work exactly like this:

1. Simulation is running. One or more ambulances are mid-journey (either heading to the incident or to a hospital), each following a currently-computed shortest path.
2. The user clicks a road segment that is **part of an ambulance's current active path** and blocks it (partial or full).
3. That ambulance's path is **recomputed live from its current position** (not from its origin) to its current destination, using A* with the new blockage state factored in — the same algorithm as the existing prototype, just re-triggered from wherever the vehicle currently is rather than from the start node.
4. The ambulance visibly bends onto the new route rather than teleporting — the change in path should be perceivable, reinforcing that the system reacted to a live event.
5. If the block affects a road segment not currently in use by any active ambulance, nothing needs to re-route immediately, but the new blockage state is factored into any *future* routing decision (new ambulance dispatch, or a later re-route trigger).

This is the direct, hands-on proof of the PRD's "dynamic graph" claim — the user causes the disruption themselves and watches the system respond, rather than being told it would.

---

## 6. Resource & Inventory Recalculation Rules

Every state change below should be instantaneous and visible at the moment it happens — not batched or delayed:

- **On victim assignment** (ambulance picks a group at the incident): site's remaining-victim count for that type decreases immediately.
- **On hospital selection** (choosing where an ambulance's cargo goes): only hospitals with currently-sufficient remaining capacity for that cargo's need are eligible — this recalculates every time, since a hospital's stock may have changed since the last assignment (another ambulance may have just delivered and used up the last beds).
- **On delivery** (ambulance arrives at hospital and unloads): the hospital's relevant inventory is decremented by exactly the delivered count. Example: an ambulance carrying 2 blood-loss victims delivering to a hospital decrements that hospital's blood bank count by 2.
- **On ambulance becoming free**: immediately checked against the current site remaining-victim count to decide reassignment — no idle delay.

The reason to make all of this visible rather than computed silently is the PRD's "Transparent" pillar: a viewer (or auditor, in the full system) should be able to reconstruct *why* any allocation decision was made just by watching the numbers change in front of them.

---

## 7. Illustrative Walkthrough (for the pitch narration)

Using the **Building Collapse** scenario as the example to narrate live during a demo:

1. Start Simulation is pressed. The collapse site starts pulsing. The site box reads: *Blood loss: 4 · Fracture: 3 · Unconscious: 2 · Limb loss: 1* (10 victims total).
2. With ambulance capacity of 2, the system immediately recognizes 10 victims cannot be cleared by fewer than 5 trips, so it calls every available ambulance rather than just the nearest one.
3. Ambulance A1 (nearest, clearest road) is assigned the 2 unconscious victims (most time-critical) and starts moving toward the incident. Its badge reads "0/2 · → INCIDENT."
4. While A1 is en route, the user blocks the road segment A1 was about to use. A1's path bends live onto a detour; the badge and route line both visibly update.
5. A1 reaches the incident, loads the 2 unconscious victims (site counter drops: *Unconscious: 0*), badge updates to "2/2 · Unconscious · → Hospital H2" because H2 is the reachable hospital with ICU + ventilator capacity.
6. A1 delivers; H2's ICU and ventilator counts each drop by 2, visible in H2's inventory box. A1 checks the site: 8 victims remain, so it's reassigned back to the incident rather than parking.
7. Meanwhile A2 and A3 have been running the same loop for the blood-loss and fracture groups, each being matched to whichever hospital currently shows sufficient blood bank or general bed stock — which may shift over the course of the simulation as hospitals fill up.
8. The simulation resolves when the site counter reads all zeros and the heartbeat stops. The final view shows each hospital's depleted inventory and the total number of trips it took — visible proof that the system adapted dynamically rather than following one fixed plan.

---

## 8. Explicit Scope Notes (what this document does NOT cover)

To keep the pitch narrative honest and avoid over-promising in the same breath as this story:
- This describes the **simulation/demo layer**, not the production MILP solver, blockchain ledger, or ZKP privacy layer from the full PRD — those remain separate roadmap items.
- Ambulance-to-victim-group assignment logic here is described behaviorally (severity/time-critical first, capacity-aware, resource-matched); the exact scoring formula used to pick *which* group an ambulance takes first when several are waiting is an implementation detail to finalize separately, not fixed by this narrative.
- This document intentionally does not specify code structure, file names, or libraries — it is the story and interaction contract the implementation must satisfy.

---

*No changes have been made to the existing prototype. This document is the agreed narrative and behavior spec to build against next.*


# RESQNET — Rebuild Plan v2
## (Fresh start, scoped to ~30 hours, aligned to the Disaster Response Simulation narrative)

---

## 0. Why We're Restarting

The Sprint 1 full-stack prototype (FastAPI + SQLAlchemy/SQLite backend, React/Vite/Leaflet frontend) accumulated enough integration problems that continuing to patch it was burning more time than a clean rebuild. **This plan throws away the "rebuild the same architecture, but fix bugs" instinct** and instead asks: *given the story we actually want to demo and the ~30 hours we have, what is the leanest architecture that can show it convincingly?*

This plan supersedes `plan.md`. Treat the original PRD as the north star for the pitch deck's "vision/roadmap" slide, not as the literal build target for the next 30 hours.

---

## 1. Architecture Decision — Read This First

**Recommendation: build the simulation as a single self-contained frontend application (HTML/CSS/vanilla JS or a single React file), with no backend, no database, no API layer.**

Why:
- Everything the narrative doc describes (victim grouping, ambulance state machine, A* pathfinding, live re-routing, inventory depletion, animation) is pure client-side logic and rendering — it does not need persistence, multi-user state, or a server round-trip to be convincing in a demo.
- A backend + DB + API layer is exactly where the last attempt burned its budget (schema mismatches, CORS/proxy issues, async state bugs across the network boundary). Cutting it removes an entire class of failure modes.
- A single file is trivially shareable, trivially demoable (open in a browser, no server to spin up before judges look at it), and trivially handed to Astra in one prompt with no "which file touches which service" confusion.

**What happens to Sprint 1's backend work?** It doesn't need to be thrown away conceptually — mention it in the pitch deck as "the data/API foundation already engineered for the production system" (it's real, tested work: 9-table schema, 30 passing tests). But it does not need to be *wired into* the thing you demo live. This is a scope decision, not a claim that the work was wasted.

**If you disagree and want the backend wired in for real**, say so now — it changes the phase plan below substantially (add ~6-8 hours for API + state sync). Proceeding on the assumption of the frontend-only build unless you tell me otherwise.

---

## 2. Scope for the 30-Hour Window

### In scope (this is the demo)
- Full narrative from `resqnet-simulation-narrative.md`: victim taxonomy/grouping, multi-trip ambulance dispatch, reassignment loop, live A* pathfinding with mid-transit re-routing, hospital inventory boxes, site heartbeat + victim counter, ambulance capacity/cargo/destination badges.
- **Live Decision Dashboard** (second wow factor, ranked right behind the interactive map): a persistent, append-only log panel next to the map that prints a timestamped line for every dispatch decision and a periodic status snapshot every simulated minute — see §3 (`DecisionLogEntry`) and §4.4 for the full spec. This is effectively the demo's stand-in for the PRD's "transparent audit trail" pillar, done as a visible UI feed instead of a real ledger — worth saying exactly that in the pitch.
- One disaster scenario fully working end-to-end (recommend **Building Collapse** — most varied injury mix, best demo narrative per §7 of the narrative doc). Other two scenarios (Flood, Gas Leak) can be config presets if time allows — not a separate build effort, just different starting data.
- Start Simulation trigger, pre-sim and mid-sim road blocking.

### Explicitly out of scope for the 30-hour build (future-work slide only)
- MILP/OR-Tools global optimizer, multi-agent RL triage
- Blockchain / hash-chain ledger, RBAC, ZKP privacy
- Real Mapbox/Deck.gl basemap, WebSocket server, 10k-agent rendering
- Backend persistence / multi-scenario database

This mirrors the priority call already made in `plan.md` §3 — we're just committing to it fully now instead of hedging.

---

## 3. Data Model (spec-level — hand this directly to Astra)

### Victim Group (revised — separates reservation from physical pickup)
```
{
  id, type: "bloodloss" | "fracture" | "unconscious" | "limbloss" | "respiratory",
  count: number,
  status: "waiting" | "reserved" | "loaded" | "delivered"
}
```
- `waiting`: sitting at the incident, eligible to be claimed by an idle ambulance.
- `reserved`: claimed by an ambulance that is still en route *to* the incident — this exists specifically so two ambulances can never claim the same group, but the group **still counts in the on-site victim counter** until physically picked up (see §4.2 revision below — this fixes the "assignment vs pickup" timing conflict).
- `loaded`: ambulance has physically reached the incident and picked it up — only now does it leave the on-site counter and appear on the ambulance's cargo badge.
- `delivered`: dropped at a hospital.

### Ambulance (revised — separates "claimed" from "physically carrying", adds stuck state)
```
{
  id, homeNode, capacity: number (default 2),
  status: "idle" | "to_incident" | "loading" | "to_hospital" | "delivering" | "stuck",
  claimedGroups: [victimGroup refs, status "reserved", assigned to this ambulance but not yet aboard],
  cargo: [victimGroup refs physically aboard, status "loaded", total ≤ capacity],
  currentPath: [node list], pathProgress: 0..1 along current edge,
  destination: nodeId
}
```
`claimedGroups` vs `cargo` is the fix for Astra's "cargo appears before pickup" bug — the ambulance badge only shows cargo (§4.4a of the narrative), so it stays empty-looking until the vehicle is actually at the incident, even though the group is already reserved. `stuck` is a new terminal-ish status: if an ambulance's destination becomes fully unreachable (blockage disconnects the graph), it shows this rather than freezing silently or crashing — surfaced in the dashboard as e.g. *"Ambulance A2 — no reachable route to H1, holding position."*

### Hospital (revised — adds reservation so two ambulances can't both claim the last bed)
```
{
  id, node,
  stock: { icu: n, blood: n, vent: n, beds: n },       // physically consumed only on delivery
  reserved: { icu: n, blood: n, vent: n, beds: n },    // claimed by an ambulance already en route
  // available for a new assignment = stock - reserved
}
```
This fixes Astra's "hospital capacity not reserved" bug: the moment an ambulance commits to a hospital (transitions to `to_hospital`), it reserves the resource amount it needs; `stock` itself only decrements at actual delivery, when the matching `reserved` amount is released. Without this, two ambulances evaluating the same hospital simultaneously could both see "enough stock" and both commit, driving it negative.

### Road / Edge — mid-transit blockage rule (resolves Astra's "retreat or stop?" question)
An ambulance already traversing a specific edge when that edge becomes blocked **finishes crossing that edge** (no mid-air retreat, no teleport) and only recomputes A* from the node it arrives at next. This is the one exception to "recompute immediately" — it's what keeps the animation physically sensible instead of needing a backward-retreat behavior we don't have time to build.

### Group splitting (resolves Astra's "group of 4, capacity 2" gap)
A victim group larger than any single ambulance's remaining capacity is split into sub-groups sized to fit (e.g., 4 fracture victims → two sub-groups of 2), each independently claimable/assignable. Since a sub-group is always a single injury type, resource-need aggregation stays simple — no mixed-cargo resource math needed.

### Fallback-hospital rule (resolves Astra's "can drive stock negative" bug)
If no hospital has *sufficient* available capacity (`stock - reserved ≥ cargo count`) for the needed resource, do **not** silently send the group to an arbitrary hospital. Instead: pick the reachable hospital with the **highest remaining available amount** of that resource (even if insufficient), reserve/consume only up to what's actually available (clamped at zero, never negative), and log it in the dashboard as a flagged, suboptimal delivery (e.g., *"Delivered 2 blood-loss patients to H2 — only 1 blood unit available, marked as under-resourced delivery."*). This is a deliberate, documented simplification for demo purposes — it keeps the simulation from ever stalling indefinitely waiting for capacity that may never free up in time, at the cost of being medically unrealistic in that edge case. Say so plainly if asked, rather than presenting it as a sophisticated waitlist system.

### Language correction: "delivered" ≠ "treated"
The simulation demonstrates **delivery to an appropriate, resourced facility** — it does not model treatment outcomes or claim to save lives. Use "delivered" / "matched to capacity" in all UI text and pitch language, never "treated" or "saved" — this avoids an unsupported claim Astra correctly flagged.

### Decision Log Entry (drives the Live Decision Dashboard, §4.4)
```
{
  id, simTime: "MM:SS" (or tick count),
  kind: "dispatch" | "hospital_select" | "delivery" | "reroute" | "snapshot",
  text: string  // human-readable line, see §4.4 for exact examples
}
```
Every dispatch-loop event in §4.2 that changes state pushes one of these; a `"snapshot"` entry is also pushed once per simulated minute regardless of whether a decision happened, so the dashboard is never silent for long. Keep entries append-only (never edit/remove a past line) — the log itself is part of the "transparency" demonstration.

### Resource-need mapping (fixed lookup table, matches narrative §2.1)
```
bloodloss   -> blood
fracture    -> beds
unconscious -> icu + vent
limbloss    -> icu + blood
respiratory -> vent
```

---

## 4. Core Algorithm Outline

### 4.1 A* pathfinding
Same as the earlier prototype: heuristic = straight-line distance, edge cost = distance × blockage penalty. **New requirement:** must be callable mid-journey — i.e., `astar(currentNode or currentEdgeMidpoint, destination)` — not only from a vehicle's original start node. When a blockage changes and it affects any ambulance's `currentPath`, recompute that ambulance's path from its current position immediately.

### 4.2 Dispatch loop (runs on a tick, e.g. every animation frame or every N ms)
```
on tick:
  for each idle ambulance:
    if any "waiting" victim groups exist at incident:
      pick highest-priority waiting group(s) that fit within capacity
        priority order: unconscious/respiratory (time-critical) > limbloss/bloodloss > fracture
        if the chosen group is larger than remaining capacity, split it into a
          capacity-sized sub-group (leave the remainder "waiting" for another ambulance)
      mark sub-group(s) "reserved", store as ambulance.claimedGroups (NOT cargo yet —
        it still counts toward the on-site victim counter until physically picked up)
      ambulance.status = "to_incident"
      compute A* path to incident
      log "dispatch" entry

  for each ambulance in "to_incident" and reaches incident node:
    status = "loading" -> after brief pause:
      move claimedGroups -> cargo, mark "loaded" (NOW it leaves the on-site counter
        and appears on the ambulance's cargo badge)
      pick destination hospital:
        candidates = hospitals where (stock[resource] - reserved[resource]) >= cargo count
        if none qualify:
          candidates = all reachable hospitals; pick the one with the highest
            (stock[resource] - reserved[resource]); flag as "under-resourced delivery"
        destination = argmin( A*(incident, hospital).cost ) over candidates
        hospital.reserved[resource] += (amount this ambulance will consume)
      status = "to_hospital", compute path
      log "hospital_select" entry with the reasoning (which hospitals were eligible/why)

  for each ambulance in "to_hospital" and reaches hospital node:
    status = "delivering" -> after brief pause:
      amount = min(cargo count, hospital.stock[resource] - already-reserved-by-others)
        // clamped so stock can never go negative, per the fallback rule
      hospital.stock[resource] -= amount
      hospital.reserved[resource] -= (this ambulance's reservation)
      mark cargo groups "delivered" (language: "delivered", never "treated")
      ambulance.cargo = []
      log "delivery" entry with stock before -> after
      if any "waiting" victim groups remain at incident: status = "to_incident" (reassign)
      else: status = "idle" (simplification: skip an animated return-to-base trip —
        the ambulance simply becomes available at its current location; this is an
        intentional time-saving simplification, not an oversight — see plan-v2 fallback list)

  // mid-edge blockage rule: an ambulance already crossing a specific edge finishes
  // crossing it even if that edge is blocked mid-traversal; A* only recomputes once
  // it arrives at the next node. If a recompute finds no path at all to the current
  // destination, status = "stuck" and this is logged, not silently frozen.

  update site remaining-victim counter = sum of "waiting" + "reserved" groups (NOT "loaded")
  push a "snapshot" log entry once per simulated minute regardless of the above
  if remaining-victim counter == 0 and no ambulance has cargo/claimedGroups: simulation resolved
```

### 4.3 Movement/animation
Each ambulance advances along its current path a fraction of the current edge's length per frame, scaled by a constant speed — not a teleport between nodes. On path recompute (due to a live block), splice the new path in from the ambulance's current interpolated position.

### 4.4 Live Decision Dashboard — exact behavior
A scrolling panel, separate from the map, that appends one line per event. Every line should be short, timestamped, and state *what* happened and *why* — this is the "second wow factor" the user wants, and it's what makes the allocator's reasoning legible instead of a black box. Example sequence (illustrative, not literal output):

```
[T+00:00] SIMULATION STARTED — 13 victims at incident (Fracture:4, Bloodloss:4, Unconscious:3, Limbloss:2)
[T+00:15] Ambulance A3 dispatched — assigned Patients #02, #06 (Blood loss). Route: A3→J2→J3→INC. Reason: nearest ambulance, clearest path.
[T+01:30] Ambulance A3 arrived at incident, loading Patients #02, #06.
[T+01:45] Ambulance A3 departing for H3 (Regional Blood Bank). Reason: only reachable hospital with ≥2 blood units (H1:0 left, H2:1 left, H3:3 left).
[T+03:10] Ambulance A3 delivered Patients #02, #06 to H3. H3 blood stock: 3 → 1.
[T+03:10] Site status: 7 victims remaining (Fracture:4, Bloodloss:2, Unconscious:1, Limbloss:0). Ambulances: A1 → H2, A2 idle, A3 reassigned → INC, A4 loading.
[T+04:10] Road J3–J9 blocked by user. Ambulance A1's active route recalculated: J3→J9→H1 blocked segment avoided, new route J3→J7→H1 (+0.8km).
```

- **Event-driven lines**: dispatch, arrival/loading, hospital selection (with the reasoning — which hospitals were considered and why they were or weren't eligible), delivery (with the before→after stock numbers), reassignment, and re-route-due-to-blockage.
- **Cadence lines**: one snapshot line per simulated minute even with no new decision, showing remaining victims by type and each ambulance's current status/destination — this satisfies "updates after every single minute" literally, not just on decision events.
- **Keep it terse.** One line per event, no paragraphs — this is a feed to skim during a live demo, not a report to read.

### 4.4b Verification, not just logging (upgrade — resolves a real gap against the original problem statement)
The actual EL-02 problem statement asks for demonstration of transparent tracking **and verification** of resource distribution — a plain append-only log gives tracking, not verification, since there's nothing proving the log itself wasn't edited after the fact. Fix: chain the dashboard entries.
- Each log entry's hash = `SHA-256(entry data + previous entry's hash)` — use the browser's built-in `crypto.subtle.digest`, no library needed.
- Add a **"Verify Log" button** near the dashboard that walks the entire chain, recomputes each hash, and confirms it matches what the next entry expected. Show a clear pass state ("✓ 42 entries verified, chain intact") and, for the demo, offer a way to deliberately corrupt one entry (a hidden dev affordance is fine) so the verify function can be shown catching it live — that's a strong demo beat in its own right.
- This is cheap to add (a few lines of hashing logic + one button) relative to what it buys: it turns "we have a log" into "we have a working, demonstrable answer to the verification requirement," not just a Q&A talking point about a production blockchain we're not building.

---

## 5. Phase-by-Phase Build Plan (hour-boxed)

| Phase | What | Est. hours | Definition of done |
| --- | --- | --- | --- |
| 0. Lock decisions | Confirm architecture (§1), graph layout, default numbers (capacity=2, victim counts, hospital stock) | 0.5 | Numbers written down, no more debate mid-build |
| 1. Static scene | Render map, nodes, hospitals w/ inventory boxes, ambulances at base, incident site (no heartbeat yet), road click-to-block (no sim running) | 2 | Can see the whole map at rest, click roads to cycle blockage |
| 2. Data model + A* | Implement data structures from §3, A* function, unit-test it against a few hand-checked paths | 2.5 | A* returns correct path/cost for known cases, including a blocked-road case |
| 3. Dispatch loop | Implement §4.2 logic without animation (state jumps instantly) — victims get grouped, assigned, "delivered", inventory decrements, reassignment loop runs to completion | 4 | Full simulation completes correctly end-to-end with instant (non-animated) transitions; site counter and hospital stock end at correct final values |
| 4. Animation | Add movement interpolation along paths, heartbeat pulse, ambulance badges (capacity/cargo/destination), live counter updates during motion (not just at completion) | 4 | Ambulances visibly move; heartbeat active only while victims remain; badges update live |
| 4.5 Decision Dashboard | Build the log panel (§4.4): push event-driven lines from the dispatch loop, push a snapshot line every simulated minute, **plus hash-chain each entry and add a Verify Log button (§4.4b)** | 3 | Every dispatch/select/deliver event produces a correct, readable log line; minute snapshots appear even when idle; Verify Log correctly confirms an intact chain and correctly flags a deliberately corrupted entry |
| 5. Live re-route | Wire road-blocking during a running simulation to trigger mid-journey A* recompute on affected ambulances, and push a `"reroute"` log line when it happens | 2.5 | Blocking a road under a moving ambulance visibly bends its path without teleporting, and the dashboard logs it |
| 6. Start trigger + polish | Start Simulation button gating all of the above; visual pass (colors, spacing, restraint per narrative §4.5); edge cases (no reachable ambulance/hospital) | 3 | Fresh page load = idle map only; pressing Start is the only way anything moves; no crash on edge cases |
| 7. Test pass | Run full scenario 3-5 times, including deliberately blocking roads at different moments, confirm no stuck states | 2 | No ambulance gets permanently stuck; simulation always resolves or clearly reports why not |
| 8. Demo prep | Rehearse the §7 walkthrough narrative live on the build (PPT itself is handled separately — see the other-Claude handoff prompt) | 2 | Can run the demo start-to-finish without narrating a bug |
| 9. Deploy | Push the finished `index.html` to a GitHub repo, enable GitHub Pages (Settings → Pages → deploy from branch, root), confirm the live URL loads and works identically to the local file | 0.5 | Live `https://<username>.github.io/<repo>/` URL opens in a fresh browser and runs the full simulation correctly |
| **Buffer** | Debugging overrun, breaks, unexpected issues | ~3-4 | — |

**Total: ~26-27 hours of work + buffer inside your ~30-hour window.** (PPT hours removed from this table since that track now runs in parallel on the other Claude account.)

---

## 6. Checkpoints — Report Back to Me After Each Phase

After each phase (or after Astra gets stuck for more than ~20-30 minutes on one issue), paste me a Phase Report using this shape:
- **Phase / task attempted**
- **What's working now**
- **What broke, and the exact error/symptom**
- **What Astra tried and what fixed it (or didn't)**
- **What's left before this phase is "done"**
- **Any scope question that needs a decision from me**

I'll use these to catch scope creep early, tell you whether to keep debugging or cut/simplify that piece, and keep `plan.md` in sync with reality rather than the plan silently drifting from what's actually built.

---

## 7. Fallback / Descope Order (if you fall behind schedule)

Cut in this order — each cut keeps the demo coherent, just less impressive:
1. Drop the third resource type nuance (treat all injury types as needing just one generic "capacity" number instead of ICU/blood/vent/beds separately) — keeps grouping/matching story but simplifies the lookup table.
2. Drop live mid-transit re-routing; keep pre-simulation road blocking only (still shows A* and blockage-awareness, just not the "live disruption" wow moment).
3. Drop smooth animation; snap ambulances between nodes instantly but keep all state/counters live-updating (still shows the *system* working, loses the visual motion).
4. Reduce to a single ambulance and a single hospital, manually walking through 2-3 victim groups (loses the "multiple ambulances called at once" scale point, keeps the core loop demonstrable).
5. Simplify the Live Decision Dashboard to event-driven lines only (drop the once-per-minute snapshot lines) — still tells the transparency story, less state-tracking to build.

Do not cut the victim grouping/matching logic itself — that is the actual thesis of the pitch; everything else is presentation polish around it.

---

## 8. Finalized Phase 0 Numbers (locked — build against these)

Grounded against the real case studies (`3_case_studies_based_on_true_disaster.docx`), scenario = **Building Collapse**, modeled on the Satya Niketan PG collapse (Delhi, Sept 2026): that real incident produced 7 dead, 12 rescued, and 5 hospitalized with injuries — i.e. roughly a dozen-plus live casualties needing hospital care, treated across AIIMS Trauma Centre and Safdarjung Hospital via CATS ambulances. Our 13-patient count sits right in that real-world range.

**Important honesty note:** the case study document explicitly states that hospital-level bed/ICU/blood/staffing capacity was *not* publicly reported for either the Satya Niketan collapse or the Kerala floods ("no verified public assessment of bed availability was published"). So while the **victim count and injury mix** below is grounded in real reporting, the **hospital inventory numbers** are an illustrative allocation we're constructing for the simulation, not sourced from real published capacity data. Say this plainly if asked in the pitch — it's still a legitimate scenario design choice, just don't claim it's a documented real number.

### Patients: 13 total, grouped by injury type
| Injury type | Count | Resource needed |
| --- | --- | --- |
| Fracture | 4 | Beds |
| Blood loss | 4 | Blood |
| Unconscious / head trauma | 3 | ICU + Ventilator |
| Limb loss / severe crush | 2 | ICU + Blood |

This mix matches typical structural-collapse injury patterns (fractures and blood loss most common, head trauma and limb loss less frequent but more resource-intensive) and matches the resource-need lookup table already in §3.

### Ambulances: 4, capacity 2 each
Max simultaneous carry = 8 of 13 patients — **guarantees at least two dispatch waves**, so the multi-trip/reassignment behavior in the narrative is structurally forced to appear in every run, not just possible.

### Hospitals: 4, deliberately uneven inventory (this is what makes matching visible)
| Hospital | ICU | Blood | Vent | Beds |
| --- | --- | --- | --- | --- |
| H1 — Apex Trauma Centre | 3 | 2 | 2 | 3 |
| H2 — City General Hospital | 1 | 2 | 1 | 4 |
| H3 — Regional Blood Bank & Multispecialty | 0 | 3 | 0 | 2 |
| H4 — District Hospital | 2 | 1 | 1 | 2 |
| **Total supply** | **6** | **8** | **4** | **11** |
| **Total demand** | **5** | **6** | **3** | **4** |

ICU, blood, and ventilator margins are intentionally thin (+1, +2, +1) so hospital selection actually matters and can visibly shift mid-simulation as stock depletes — beds are left abundant since fracture care is realistically the least contested resource in a mass-casualty triage. H3 having zero ICU/vent but the best blood stock, and H4 being small-but-balanced, are what create genuinely different "best hospital" answers for different cargo — this is the transparency payoff in action.

### Confirmed architecture
- Frontend-only, no backend (§1) — confirmed.
- Building Collapse as the one fully-built scenario — confirmed.

---

## 8a. Explicit Scope Exclusion: Fund Distribution (name this, don't hide it)
The original EL-02 problem statement asks for tracking of "resource **and fund** distribution," twice. Neither this simulation nor any earlier plan for it models money at all — it's physical-resource-only (ambulances, beds, blood, ventilators). This has been a gap since the very first planning pass, not something the RESQNET pivot dropped. Given the remaining time, we are **not** adding a funds dimension — bolting on a fake financial mechanic this late would dilute the core injury-matching story for a box-ticking exercise. Instead, name it explicitly and confidently in the pitch (Feasibility or Innovation slide): *"This prototype demonstrates dynamic allocation for physical relief resources (ambulances, beds, blood, ventilators); fund-flow tracking would extend the same hash-chained dashboard pattern already built, and is scoped as a near-term roadmap item."* Naming a deliberate gap with a credible extension path reads far better under questioning than an invisible one.

## 8b. Pitch-Framing Correction: Don't Let the PRD Imply More Than the Demo Does
The full PRD's technical ambition (MILP/OR-Tools, Kafka, Hyperledger, 10,000-agent rendering) doesn't trace back to the actual PS text, which only asks for dynamic allocation + transparent tracking/verification, and treats blockchain-style tech as explicitly optional ("may be explored"). The current demo runs a **deterministic priority-rule + resource-matching + A\* pathfinding allocator** — not a global optimizer. The deck must say this plainly wherever the roadmap (MILP, real ledger, Mapbox/Deck.gl) is mentioned: frame it as *aspirational roadmap*, not as "the same system, just bigger." If a judge watches the live demo run a greedy/priority allocator and then reads "roadmap: MILP global optimization engine" without that distinction being explicit, it risks reading as overclaiming. Say the honest version instead: *"the current prototype proves the matching-and-transparency concept end-to-end; a production system would replace the priority-rule allocator with a global MILP/OR-Tools optimizer for provably better allocations at scale."*

## 8c. Explicit Scope Exclusion: Privacy Controls / RBAC (same treatment as §8a)
The PS text asks for tracking "across stakeholders, **with appropriate privacy controls**." §2 correctly lists RBAC/ZKP as out-of-scope, but it was never given a named callout the way funds now is — same category of gap, same fix: name it, don't let it be silently absent.
> Deck line: *"This prototype demonstrates the allocation and transparency mechanics for a single operator view; role-based access so different stakeholders (hospitals, donors, government) see only what they're authorized to is the same PRD pillar, scoped as a near-term extension once the core matching engine is validated."*
Approved as drafted — fold into the deck now.

## 8d. Demand-Side Dynamism — Stretch Goal, Not Core Scope
The PS lists three dynamic vectors ("demand, infrastructure, or resource availability"). Infrastructure (road blocks) and resource availability (hospital depletion) are both genuinely live; victim demand is fixed at 13 from T+00:00 — no mid-run casualty surge. This is real and worth one deck line either way:
> *"Infrastructure and resource availability update live during the simulation; a mid-event demand surge (e.g. a secondary casualty wave) uses the same reassignment logic already built, and is a fast extension rather than new engine work."*
**Decision on whether to actually build it**: given the remaining hour count (§9 below), this is explicitly a stretch goal, not a required phase — only attempt it if Phases 4-9 finish with time to spare. Do not let it compete for hours against anything already in the phase table. If it doesn't get built, the deck line above still holds (it's phrased as a capability claim about the architecture, not a claim that it's already running) — use it as-is either way.

## 9. Confirmed Logistics (locked)

- **Deadline: September 30, 2026** — exact cutoff time not yet specified; treating the original ~30-hour estimate as still roughly accurate unless a tighter time surfaces. Worth pinning down the exact hour if possible, since "Sept 30" alone leaves real ambiguity between an early-morning and end-of-day cutoff.
- **Team name: No Free Lunch.** **PS ID: EL-02.** Submission filename should follow the template's `psid_teamname` pattern — recommend `EL-02_NoFreeLunch` (no spaces) unless the organizers specify otherwise; the template doesn't clarify casing/spacing conventions, so this is a reasonable reading, not a confirmed rule.
- **Deployment: a live, deployed URL — not a laptop-recorded demo. Specifically, GitHub Pages, not a Claude Artifact link.** Given the frontend-only, single-HTML-file architecture already locked in §1, GitHub Pages deployment is trivial: push the finished file as `index.html` to a repo, enable Pages in the repo settings (Settings → Pages → deploy from branch, root), and the live URL is `https://<username>.github.io/<repo-name>/`. No build step, no server config, no framework tooling needed — it's a static file. This doesn't change anything about how Astra builds the file; it only changes the final hand-off step. Note: this Claude session has no internet access, so the actual `git push` / GitHub Pages setup has to be done by you directly (or by Astra/GPT if either has that capability) — not something this planning thread can execute.
- **Sequencing: demo/deployment first, PPT second.** The deck's demo-dependent content (architecture description, screenshots, the live link itself) waits on the actual build; PPT-side work should proceed now only on sections that don't depend on the finished artifact (problem framing, research/citations, judging-criteria-aligned structure), then get finalized once the live URL exists.
- **No code exists yet** — Astra is starting Phase 1 from zero, now.
- **Time-budget reality check**: summing the remaining listed work (Phase 4 fix + 4.5 + 5 + 6 + 7 + 8 + 9) comes to roughly 16-17 hours still ahead as of this checkpoint — tighter than "~30 hours" reads as an abstraction, especially once what's already spent through Phase 3/4 is accounted for. **The exact deadline cutoff time (not just the date) genuinely needs pinning down now** — "Sept 30" alone leaves too much slack between an early-morning and end-of-day cutoff to plan the remaining hours confidently. If the real number is materially tighter than 16-17 hours, the fallback/descope order in §7 should be applied proactively rather than reactively — cut before falling behind, not after.
