# RESQNET Hackathon — Context Handoff
*(Paste this whole document as your first message to ChatGPT/Astra or to Claude on another account. It's written to stand alone — the reader doesn't need anything else to be fully oriented.)*

---

## 1. What This Project Is

**RESQNET** is our hackathon submission for challenge **EL-02: Intelligent and Transparent Disaster Relief Resource Allocation**. The full PRD envisions a production system with a dynamic MILP/graph optimization engine, a tamper-evident blockchain ledger, and a real-time Mapbox/Deck.gl dashboard. That is the long-term vision, referenced in the pitch deck — **it is not what we are building in the next ~30 hours.**

## 2. What Happened So Far

- **Sprint 1** built a real full-stack foundation: FastAPI + SQLAlchemy/SQLite backend (9-table schema, 30 passing pytest tests), React/Vite/TypeScript frontend with an offline Leaflet map, 3 seeded disaster scenarios (Flood, Building Collapse, Industrial Gas Leak). This work is real and can be mentioned in the pitch deck as engineering foundation, but it is **not being wired into the live demo**.
- An attempt to build the actual simulation/dashboard on top of that foundation ran into enough bugs and integration problems that it was scrapped rather than continuing to patch it.
- **We are now restarting with a deliberately leaner architecture** (see §4) built directly around the story below, aiming for something that reliably works in a live demo rather than something architecturally complete.

## 3. The Story We Are Simulating

This is the actual thesis of the pitch — read it carefully, it drives every implementation decision:

> Most disaster-allocation demos cheat: one ambulance, one patient, nearest hospital. Real disasters produce a **mixed population of injuries** (blood loss, fractures, unconsciousness, limb loss, respiratory distress) all at once, **more victims than any single vehicle can carry**, and hospitals that are each good at different things (some have blood banks, some have ICU beds, some have ventilators — and all of it depletes as it's used). The system should **group victims by what they need, match them to whichever reachable hospital currently has that resource, and make multiple ambulance trips as real disasters require** — with everything visibly re-adapting in real time, including live road blockages disrupting an ambulance already mid-journey.

Concretely, the demo must show, live and visually (not in a paragraph of text):
- **Incident site**: a pulsing "heartbeat" indicator active for as long as any victim remains unrescued, plus a small counter box showing remaining victims broken down by injury type.
- **Ambulances**: each one physically animates along its route (not teleporting), and shows a small badge with its capacity, current cargo type, and destination. When it delivers its cargo, if victims remain on-site it is **automatically reassigned back** rather than idling — this is what makes it "dynamic."
- **Hospitals**: each has a persistent, live-updating inventory box (ICU beds / blood units / ventilators / general beds). Delivering victims decrements the relevant stock immediately, visibly changing which hospital future ambulances get routed to. This is the "transparency" payoff — a viewer can *see why* a hospital was or wasn't chosen.
- **Road blocking**: clicking a road cycles it clear → partial → fully blocked. This must work **both before and during** a running simulation. If a blocked road is part of an ambulance's *current* path, that ambulance must recompute its shortest path (A*) live, from its current position, and visibly bend onto the new route.
- **Explicit restraint**: don't clutter the screen. Only the elements above are always-visible; no constant text logs, no numeric overlays on every road, no labels on idle ambulances.

The full detailed spec (state machines, data shapes, a worked walkthrough) lives in two documents already produced: `resqnet-simulation-narrative.md` (the story/behavior contract) and `plan-v2.md` (the phased build plan). If you don't have those files, ask for them before writing code — don't guess at the details above.

## 4. Architecture Decision for the Rebuild

**Frontend-only. No backend, no database, no API calls.** Everything (victim groups, ambulance state machine, A* pathfinding, animation, inventory tracking) is client-side JS/state, rendered as a single self-contained HTML file (or a single-file React app — whichever the builder is more comfortable with, but keep it to one file / no server). This was chosen specifically to eliminate the class of bugs (API contracts, CORS, async state desync) that sank the previous attempt, given the tight time budget.

Data model, algorithm pseudocode, and a full phase-by-phase timeline with hour estimates are in `plan-v2.md` — use it as the actual task breakdown rather than re-deriving scope from scratch.

## 5. Roles for This Build

- **Claude (planning lead)** owns: architecture decisions, breaking the plan into concrete tasks, reviewing progress reports, deciding what to cut if time runs short, keeping the plan in sync with what's actually built, and pitch-deck content.
- **You (ChatGPT/Astra, execution)** own: writing and debugging the actual code for each phase, working through implementation problems, and reporting back after each phase (or whenever stuck for a while) using the exact template below. Don't silently change the architecture or scope described above — if something in the plan seems wrong once you're in the code, flag it in your report rather than deciding unilaterally to restructure.
- **If you are the other Claude account**: your job is to stay in sync with this context and be available for a second opinion or parallel planning thread if asked — you are not the one writing code for this build.

### Report-back template (fill this in after each phase / when stuck)
```
Phase / task attempted:
What's working now:
What broke (exact error/symptom):
What was tried, and what fixed it (or didn't):
What's left before this phase is done:
Any scope question that needs a decision:
```

## 6. Time Budget

Roughly **30 hours total** remain until the submission deadline, covering both the build and the pitch deck. `plan-v2.md` §5 has the full hour-boxed phase table and §7 has an explicit fallback/descope order if things run behind — cut in that order rather than improvising a different cut.

## 7. Ground Rules to Avoid Burning Time/Tokens

- Don't ask the execution AI to build the entire thing in one giant prompt — feed it one phase at a time from `plan-v2.md` §5, and require a report-back before moving to the next phase.
- If a bug takes more than ~20-30 minutes without progress, stop and report back rather than continuing to iterate blind — a fresh look with full context is usually faster than more trial and error.
- Don't let the execution AI silently add scope (e.g., "I also added a login system" / "I switched this to use a backend for cleanliness") — anything outside the current phase's stated task should be flagged, not just done.