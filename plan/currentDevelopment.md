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
