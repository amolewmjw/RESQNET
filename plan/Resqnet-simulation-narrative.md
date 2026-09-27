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