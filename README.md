# RESQNET

**Disaster response simulation · Team No Free Lunch · EL-02**

| Submission detail | Value |
| --- | --- |
| Event | DJSCE ELEVATE 1.0 |
| Team | No Free Lunch |
| Problem statement ID | EL-02 |
| Problem statement | Intelligent and Transparent Disaster Relief Resource Allocation |
| Implemented scenario | Building Collapse |
| Architecture | Static frontend — HTML, CSS and vanilla JavaScript |

## Abstract

RESQNET demonstrates how limited ambulances and uneven hospital resources can be coordinated during a disaster. In an illustrative building-collapse scenario, four two-seat ambulances transport 13 patients grouped by injury type. A deterministic priority-based allocator assigns pickup batches, matches their resource requirements against reachable hospitals, reserves available capacity and schedules repeat trips. A* routing responds to road conditions changed by the operator during the simulation. A live decision dashboard records allocation reasoning, inventory changes and reroutes. Its SHA-256 hash chain supports verification and a deliberate-tampering demonstration. The prototype makes allocation decisions and their consequences visible; it does not model treatment outcomes or provide a production emergency-management service.

## What the simulation demonstrates

- Four ambulances carrying capacity-sized, single-injury batches over multiple trips.
- Matching against ICU beds, blood, ventilators and general beds, with reservations before arrival and stock consumption on delivery.
- Interactive clear, partial and blocked roads, including live rerouting and automatic retry after road changes.
- Continuous movement, compact vehicle ID/capacity badges, live inventory cards and pinned fleet status.
- Normal 1× playback by default, with Demo 0.1×, Fast 4× and Pause.
- Timestamped event reasoning, per-simulated-minute snapshots and Verify Log with detailed hash mismatches.
- Completion totals for patients delivered, under-resourced deliveries, elapsed simulated time and delivery trips.

## Run locally

No dependency installation or build step is required. Extract or clone the **whole repository**, preserving its folders.

With Node.js 18 or newer:

```sh
npm start
```

Open **http://localhost:8080**. Stop the server with Ctrl+C. Alternatively, use a local static server such as PyCharm's preview. The plain script format also permits opening `index.html` directly in browsers that support Web Crypto on local files; localhost is the recommended test route. Hosted use should be over HTTPS for Web Crypto.

## Run tests

```sh
npm test
```

No `npm install` is needed. The runner reports every test file and writes detailed output to `docs/test-results.txt`. Any failure or checksum mismatch exits nonzero.

See [verification](docs/verification.md) for coverage, current results and the distinction between automated and user-performed checks.

## Repository guide

| Path | Purpose |
| --- | --- |
| `index.html` | Application markup and ordered script/style references |
| `assets/css/styles.css` | Approved visual styling and responsive layout |
| `assets/js/config.js` | Scenario numbers and schematic graph coordinates |
| `assets/js/core.js` | A*, dispatch, reservations, inventory and movement |
| `assets/js/audit.js` | Event descriptions, minute snapshots and hash-chain verification |
| `assets/js/playback.js` | Playback rate and fleet status descriptions |
| `assets/js/layout.js` | Display offsets constrained to the approved 6-unit cap |
| `assets/js/app.js` | SVG rendering, controls and event wiring |
| `tests/` | Node regression tests and lightweight DOM-handler harness |
| `scripts/serve.cjs` | Optional local development server |
| `docs/` | Submission abstract, verification and demo/deployment guidance |
| `media/` | Your final recording and simulation screenshots |

Scripts are intentionally loaded as ordinary scripts in their original order. There is no bundler, framework, CDN dependency, backend or database.

## Demo and screenshots

The final recording and screenshots will be added by the team. No placeholder images or unverified live links are presented as finished deliverables.

Place the recording at `media/demo.mp4` and screenshots in `media/screenshots/`. Follow [media instructions](media/README.md) to add working README links and a direct video URL for the PPT. See the [demo walkthrough](docs/demo-and-deployment.md).

## Important scope and limitations

- This is a deterministic priority-rule and resource-matching allocator with A*, not a global MILP optimizer or an ML model.
- Patient mix, hospital inventories and the road network are illustrative. The scenario references the supplied Satya Niketan case study; these inputs are not live or verified hospital-capacity data.
- When no reachable hospital has sufficient resources, the documented fallback selects the best available resource coverage, clamps consumption to available stock and flags the delivery as **under-resourced**. Delivered does not mean treated or saved.
- A vehicle already crossing an edge finishes that edge before applying a blockage-triggered route change. No route means Holding; changing roads triggers another attempt.
- Idle ambulances remain at their last location; no return-to-base trip is animated.
- The local hash chain detects inconsistencies in retained entries. It is not a blockchain, externally anchored proof or authentication mechanism: an actor able to replace the entire chain can rebuild it. Reloading clears the session.
- Exact co-location can leave icon overlap under the approved small-offset cap. The invariant takes priority over moving vehicles away from roads.
- Funds, privacy/RBAC, live telemetry, treatment outcomes, demand surges and additional scenarios are outside this prototype's implemented scope.

## Deployment

This package is prepared for static GitHub Pages hosting but has not been deployed. Publish from the branch root, where `index.html` resides. See [deployment steps](docs/demo-and-deployment.md). Upload the extracted contents, not just the ZIP or `index.html` alone.

## Project status

Phase 6 behavior was accepted by the user after local runs covering live road changes, playback controls and Verify Log. This repository is a structural extraction of that approved build. Automated checks prove exact reconstruction of the original HTML/CSS/JS and exercise the production files. A fresh browser smoke test of the extracted repository and final hosted URL remains a release step.

The team's licensing decision is not specified in this package; no open-source license has been assumed.
