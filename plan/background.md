# EL-02: Intelligent and Transparent Disaster Relief Resource Allocation

## 1. System Architecture Overview

+-----------------------------------------------------------------------------------+
|                            INGESTION & DATA PIPELINES                             |
|    IoT Sensors | Field Reports | GIS & Traffic Feeds | Hospital Status APIs        |
+-----------------------------------------+-----------------------------------------+
|
v
+-----------------------------------------------------------------------------------+
|                        DYNAMIC ALLOCATION & OPTIMIZATION ENGINE                  |
|    - Dynamic Graph Engine (Dynamic Dijkstra / A*)                                 |
|    - Constrained Optimization (MILP / Vehicle Routing with Time Windows)          |
|    - Multi-Agent Reinforcement Learning / Triage Prioritization                  |
+-----------------------------------------+-----------------------------------------+
|
+--------------------------+--------------------------+
|                                                     |
v                                                     v
+-------------------------------------------+   +-------------------------------------------+
|     REAL-TIME VISUALIZATION & MONITORING  |   |    TAMPER-EVIDENT LEDGER & AUDIT TRAIL   |
|   - Mapbox / Deck.gl Heatmaps             |   |   - Smart Contracts / Immutable Ledger    |
|   - WebSockets / gRPC Event Streams       |   |   - Zero-Knowledge Privacy & RBAC         |
|   - Live Fleet & Supply Telemetry         |   |   - Cryptographic Proof of Delivery       |
+-------------------------------------------+   +-------------------------------------------+


---

## 2. Core Technical Requirements & Engineering Design

### 2.1 Dynamic Optimization & Resource Allocation Engine

#### Core Problem Formulation
Traditional approaches rely on static, local heuristics like First-Come-First-Served (FCFS) or Nearest-Hospital routing. EL-02 replaces these with a global system-wide optimization model.

* **Objective Function:** Maximize lives saved and resource coverage while minimizing total allocation latency, transit times, and resource exhaustion risks.

$$\min \sum_{i \in \text{Patients}} \sum_{j \in \text{Hospitals}} \left( w_1 \cdot T_{ij}(t) \cdot S_i + w_2 \cdot C_j(t) \right) + \sum_{k \in \text{Supplies}} w_3 \cdot D_k(t)$$

* **Variable Definitions:**
  * $S_i$: Severity level / Triage score of patient $i$ ($S_i \in [1, 5]$).
  * $T_{ij}(t)$: Dynamic travel time from incident location $i$ to facility $j$ at time step $t$.
  * $C_j(t)$: Operational saturation/capacity penalty of hospital $j$ at time step $t$.
  * $D_k(t)$: Supply deficit penalty for resource $k$ (ICU beds, blood types, ventilators, emergency funds).
  * $w_1, w_2, w_3$: Dynamic weight multipliers adjusted based on disaster phase.

#### Dynamic Constraints & Graph Modeling
1. **Dynamic Road Graph ($G = (V, E, W(t))$):**
   * Vertices ($V$): Incident sites, supply warehouses, staging areas, hospitals.
   * Directed Edges ($E$): Transport routes.
   * Time-Varying Weights ($W(t)$): Edges update dynamically based on real-time flood models, debris blockages, and traffic congestion feeds.
2. **Resource Constraints:**
   * ICU Bed, Oxygen, and Blood Bank availability constraints: $\sum \text{Allocated}_j(t) \le \text{Capacity}_j(t)$.
   * Ambulance battery/fuel constraints and specialized equipment matching (e.g., ALS vs. BLS units).

---

### 2.2 Transparent Ledger & Traceability Layer

#### Architectural Setup
* **Immutable Audit Log:** Implements smart contracts or a append-only cryptographic ledger (Hyperledger Fabric / EVM L2 / Merkle Tree Ledger).
* **State Event Lifecycle:**
  1. `ResourceRequested` $\rightarrow$ Patient/Field worker logs requirement.
  2. `AllocationCommitted` $\rightarrow$ Optimization engine assigns resource to target.
  3. `InTransit` $\rightarrow$ GPS telemetry checkpoint logged.
  4. `ResourceDelivered` $\rightarrow$ Cryptographic signature / QR verification by recipient.

#### Privacy & Security Mechanisms
* **Role-Based Access Control (RBAC):** Public entities can view global fund allocations and anonymous resource throughput.
* **Privacy Assurance:** Sensitive Patient Health Information (PHI) and PII are masked using hashes or Zero-Knowledge Proofs (ZKPs) to verify eligibility without revealing identities.

---

### 2.3 Dashboard & Real-Time Visualization

* **Map Layer:** High-performance spatial rendering using **Deck.gl** / **Mapbox GL JS** for rendering 10,000+ active agents, blocked routes, dynamic isosurfaces, and hospital capacity heatmaps.
* **Pub/Sub Pipeline:** Real-time bi-directional streaming via **WebSockets** or **gRPC** pushing dynamic re-allocation events, trip rerouting, and capacity alerts directly to field agents and command posts.

---

## 3. Recommended Tech Stack

| Domain | Technology / Library | Role |
| :--- | :--- | :--- |
| **Backend Framework** | Python (FastAPI), Node.js (NestJS) | Core API Services, Ingestion, Gateway |
| **Optimization Solvers** | Google OR-Tools, PuLP, Pyomo | MILP Solver, Vehicle Routing Problem (VRP) |
| **Graph Processing** | NetworkX, Rust Network Graphs | Dynamic Pathfinding (Dijkstra/A*) |
| **Databases** | PostgreSQL + PostGIS, Redis | Spatial queries, dynamic state caching |
| **Real-time Engine** | Apache Kafka / Redis PubSub | Streaming telemetry and system events |
| **Frontend UI** | React / Next.js, TailwindCSS | Dashboard interface |
| **Geospatial UI** | Mapbox GL JS, Deck.gl | Layered spatial map visualization |
| **Ledger / Smart Contracts** | Solidity (EVM), Hyperledger Fabric | Tamper-evident asset & fund tracking |

---

## 4. Implementation Strategy & Deliverables Roadmap

                              PROTOTYPE ROADMAP
[ Phase 1: Simulation Setup ] ──> [ Phase 2: Engine Development ]

Define synthetic GIS map       - Build OR-Tools/MILP solver

Inject dynamic events          - Test dynamic route changes
│
▼
[ Phase 4: UI & Telemetry ]   <── [ Phase 3: Ledger Integration ]

Build Deck.gl dashboard        - Deploy smart contracts

Live stream event data         - Verify transparent tracking


### Phase 1: Disaster Simulation Framework
* Build a synthetic environment representing a disaster area (e.g., city grid with 50 incident sites, 10 hospitals, 20 ambulances, 5 supply hubs).
* Implement simulated event injectors:
  * *Event A:* Bridge collapse at $t=5\text{ mins}$ (Edge weight $\rightarrow \infty$).
  * *Event B:* Hospital A reaches 100% ICU capacity at $t=12\text{ mins}$.
  * *Event C:* Mass casualty event at Location X at $t=20\text{ mins}$.

### Phase 2: Solver vs. Static Baseline Benchmarking
* Develop two allocation strategies:
  1. **Static Baseline:** Nearest hospital + First-Come-First-Served allocation.
  2. **EL-02 Dynamic Solver:** Global MILP dynamic re-balancer.
* Evaluate performance using key metrics:
  * **Average Time to Treatment (TTT)**
  * **Hospital Overcrowding Index**
  * **Resource Utilization Efficiency (%)**

### Phase 3: Audit Trail Integration
* Deploy smart contracts to log:
  * Emergency fund disbursements (Donor $\rightarrow$ NGO $\rightarrow$ Supply Purchase).
  * Medical item transfers (Warehouse $\rightarrow$ Transit Agent $\rightarrow$ Field Hospital).
* Implement public verification portal allowing external auditors to inspect tamper-proof event logs.

### Phase 4: Command Center Dashboard
* Construct an interactive dashboard providing:
  * **Live Incident Map:** Visualizing active rerouting paths and blocked areas.
  * **Capacity Gauges:** Real-time hospital ICU/Blood supply counters.
  * **Audit Feed:** Live immutable transaction log showing resource delivery statuses.


# RESQNET - Project Summary (Sprint 1)

**RESQNET** (EL-02) is a local simulation foundation for Intelligent & Transparent Disaster Relief Resource Allocation. This document provides a comprehensive summary of both the frontend and backend architecture, module breakdowns, and the milestones achieved in Sprint 1.

---

## 🏗️ Backend Architecture

The backend is built with Python 3.12, utilizing **FastAPI** for robust, high-performance REST APIs and **SQLAlchemy** with **SQLite** for relational data persistence.

### Key Modules & Responsibilities
| Module | Responsibility |
| --- | --- |
| `app/main.py` | App factory, lifecycle management (startup/shutdown events), and four core REST endpoints (`/api/health`, `/api/scenarios`, `/api/simulation`, `/api/simulation/reset`). |
| `app/database.py` | SQLite engine configuration, session management, and enforcement of foreign key constraints. |
| `app/models.py` | Definition of the nine SQLAlchemy ORM models with strict database-level constraints. |
| `app/schemas.py` | Pydantic models for request/response validation and typed API contracts. |
| `app/simulation.py` | Handles seed loading, transactional scenario resets, and fetching persistent snapshots under a single process lock. |
| `app/graph.py` | In-memory **NetworkX** graph representation handling road networks, hazard attributes, and restrictions (pathfinding deferred to future sprints). |
| `app/interfaces.py` | Typed protocols (interfaces) mapping out future services for routing, allocation, and audit trails. |
| `data/scenarios/` | Synthetic JSON fixtures defining initial states for Flood, Building Collapse, and Industrial Gas Leak scenarios. |

---

## 🎨 Frontend Architecture

The frontend is a modern Single Page Application (SPA) built using **React 18**, **TypeScript**, and **Vite**, styled with **Tailwind CSS**. It incorporates interactive offline maps using **React Leaflet**.

### Key Modules & Responsibilities
| Module | Responsibility |
| --- | --- |
| `src/api.ts` | Centralized API client handling requests, error parsing, and timeout management. |
| `src/SimulationContext.tsx` | Global React Context providing the shared backend snapshot, managing loading states, errors, and reset triggers. |
| `src/SimulationMap.tsx` | Offline Leaflet implementation using `CRS.Simple` mapping coordinates to schematic resource markers. |
| `src/App.tsx` | Main dashboard layout composing simulation controls, resource tables (patients, fleet, hospitals, roads), and metric cards. |
| `src/types.ts` | Shared TypeScript interfaces matching the backend's Pydantic schemas. |
| `src/styles.css` | Global styles extending Tailwind CSS for responsive behavior across desktop and mobile viewing. |

---

## 🗄️ Database Design

The local simulation utilizes 9 strict SQLite tables. State changes are handled atomically; a scenario reset wraps deletions and insertions within a single rolled-back transaction on failure. 
- **Core Entities:** `simulation_meta`, `road_nodes`, `hazard_zones`, `roads`, `ambulance_types`, `equipment_types`, `ambulances`, `hospitals`, `patients`.
- **Validation:** Independent SQL constraints check numeric bounds, patient severities, resource statuses, and hospital authorization categories (Government, Authorized Private, Non-authorized Private).

---

## ✅ Achieved Milestones (Sprint 1)

Sprint 1 focused purely on establishing a bulletproof foundation. The following requirements have been fully implemented and verified:

1. **Full Stack Scaffolding:** Python/FastAPI backend and React/Vite frontend wired correctly with proxy configurations.
2. **Robust Data Persistence:** SQLite + SQLAlchemy ORM enforcing 9 tables with foreign keys and strict categorical constraints.
3. **Complex Resource Modeling:** Detailed ambulance attributes (equipment, crew availability, dimensions, position capacities) and independent patient requirements.
4. **Synthetic Network & Scenarios:** NetworkX graphs spanning 9 nodes and 12 roads populated across 3 configurable disaster scenarios (Flood, Collapse, Gas Leak).
5. **Interactive Dashboard:** Offline Leaflet schematic map with integrated React data tables and simulation controls.
6. **Atomic State Resets:** Global scenario restoration endpoint ensuring transactional integrity when resetting simulations.
7. **Comprehensive Testing:** Passed 30 backend tests (pytest) and 4 end-to-end browser tests (Playwright).

> [!NOTE]
> **Sprint 1 Scope Limitations:** Complex operations such as real-time vehicle movement, clinical triage grouping, pathfinding, audit ledgers, WebSockets, and real mapping services are explicitly deferred to Sprint 2 and beyond. The current setup serves as the stable bedrock for these future features.
