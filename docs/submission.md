# Submission details

- Project: RESQNET — Disaster Response Simulation
- Team: No Free Lunch
- Event: DJSCE ELEVATE 1.0
- PS ID: EL-02
- PS name: Intelligent and Transparent Disaster Relief Resource Allocation
- Suggested submission basename: `EL-02_NoFreeLunch` (confirm organizer naming rules)
- Team-member roster, live site URL and final video URL: to be added by the team before submission.

## Abstract

RESQNET is a browser-based disaster response prototype that demonstrates resource-aware patient transport and transparent decision tracking. Its building-collapse scenario includes 13 patients across four injury categories, four ambulances with two seats each, and four hospitals with uneven ICU, blood, ventilator and bed inventories. A deterministic priority-based dispatch process assigns pickup groups, reserves hospital resources, updates stock on delivery and reassigns available ambulances until transport is complete. A* routing adapts to road blockages introduced during a run, while unreachable vehicles visibly hold and retry after road changes. The live dashboard explains dispatches, hospital eligibility, deliveries and reroutes, with a SHA-256 hash chain and an interactive verification/tampering demonstration. The implementation proves matching, rerouting and local audit-integrity mechanics using illustrative inputs; global optimization, fund-flow tracking and stakeholder privacy controls remain future work.

## Demonstration sequence

1. Show the 13 patients, four ambulances and uneven hospital inventories.
2. Start; explain priority grouping, capacity limits and empty versus occupied vehicles.
3. Block an upcoming active-route road and show its reroute log.
4. Observe resource reservations influencing subsequent hospital eligibility and stock decreasing on delivery.
5. Show another pickup wave and the final summary, including any under-resourced deliveries.
6. Verify the intact log. In `#audit-dev`, corrupt entry 2 and verify again to show both hashes.

## Claims to keep precise in the PPT

- “Patients delivered,” not “patients saved” or “treated.”
- “Priority-based allocation with resource matching and A*,” not “global optimizer.”
- “Local hash-chain integrity verification,” not “immutable blockchain” or proof that events happened in the real world.
- Hospital stocks, injury counts and map are illustrative scenario inputs.
- The single-operator prototype does not implement fund distribution or RBAC/privacy controls.
