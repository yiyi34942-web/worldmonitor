# WTILS — World Trade Intelligence Layer System

## Phase 1: Registry Foundation

**Version**: 1.0.0

WTILS (World Trade Intelligence Layer System) is a declarative, registry-driven intelligence production system for global commodity and trade intelligence. Phase 1 delivers the **Registry Foundation** — the complete set of registries, contracts, profiles, and methodologies that define *what* the system knows and *how* it should operate, independent of any specific execution engine.

## What WTILS Does

WTILS produces validated, traceable, reproducible intelligence about global commodity markets. It covers:

- **Energy**: Crude oil, LNG, natural gas, refined products, petrochemicals, coal
- **Metals**: Base metals, precious metals, iron ore
- **Agriculture**: Grains, oilseeds, soft commodities
- **Infrastructure**: Maritime freight, carbon/emissions markets

Intelligence products range from real-time price assessments to multi-horizon supply-demand forecasts, geopolitical risk evaluations, and cross-commodity correlation analyses.

## What Phase 1 Delivers

Phase 1 delivers the **declarative foundation** — the registries, schemas, and contracts that make the system self-describing and validatable:

| Deliverable | Description | Status |
|-------------|-------------|--------|
| **8 Registries (R1–R8)** | Profile, Role, Methodology, API, Delivery, Source, Lifecycle, InfoAvailableAtT | Defined |
| **10 Profiles (P01–P10)** | Default routing templates for each commodity domain | Defined |
| **31 Methodologies (M01–M24, C01–C07)** | 24 formal methodologies + 7 governance contracts | Defined |
| **25 API Contracts (A00–A24)** | Metadata coverage for all data sources, including 2 PENDING_GROK_BUILD | Defined |
| **Lifecycle State Machine** | DRAFT → REVIEW → PUBLISHED → DEPRECATED → ARCHIVED | Defined |
| **PIT Contract** | Point-in-Time reproducibility guarantee | Defined |
| **Data State Semantics** | Missing ≠ zero three-valued logic | Defined |
| **Composition Formula** | Research Result = R1 × R2 × R3 × R4 × R5 × R6 × R7 × R8 | Defined |
| **Validation Approach** | Static (build time), Dynamic (run time), Continuous (background) | Defined |

Phase 1 is **schema-complete but not execution-complete**: it defines what the system *should* do, not how to *run* it. Execution is the responsibility of Grok Build (Phase 2+).

## What Belongs to GLM vs Grok Build

WTILS is designed as a **two-layer architecture** where declarative knowledge (GLM layer) is cleanly separated from operational execution (Grok Build layer):

### GLM Layer (This Repository)

The GLM layer owns **all declarative content** — the "what" and "why":

| Responsibility | Owned By | Location |
|----------------|----------|----------|
| Registry definitions (R1–R8) | GLM | `wtils/registry/` |
| Methodology specifications | GLM | `wtils/registry/R3_methodology/` |
| Profile configurations | GLM | `wtils/registry/R1_profile/` |
| API contract schemas | GLM | `wtils/registry/R4_api/` |
| Governance contracts (C01–C07) | GLM | `wtils/registry/R3_methodology/` |
| Lifecycle state machine definitions | GLM | `wtils/registry/R7_lifecycle/` |
| Documentation | GLM | `wtils/docs/` |
| Validation schemas (JSON Schema) | GLM | `wtils/schemas/` |
| Version and compatibility declarations | GLM | `wtils/VERSION` |

**Rule**: If it can be expressed as a schema, a contract, or a configuration, it belongs to the GLM layer. The GLM layer contains **no executable code** — only declarations.

### Grok Build Layer (Phase 2+)

Grok Build owns **all operational content** — the "how":

| Responsibility | Owned By | Depends On |
|----------------|----------|------------|
| Registry resolution engine | Grok Build | R1–R8 definitions |
| Dependency graph construction | Grok Build | R3 methodology dependencies |
| API contract binding | Grok Build | R4 contract schemas |
| Pipeline compilation | Grok Build | R1–R8 resolved configuration |
| Execution runtime | Grok Build | Compiled pipeline |
| A23 (ML Model Serving) implementation | Grok Build | ML model training artifacts |
| A24 (Real-Time Streaming) implementation | Grok Build | Streaming infrastructure |
| Data connectors and fetchers | Grok Build | R4 API endpoints |
| Validation engine (runtime) | Grok Build | R3 governance contracts |
| Audit log infrastructure | Grok Build | C04 contract |

**Rule**: If it executes, fetches data, or produces runtime output, it belongs to Grok Build. Grok Build consumes the GLM layer's declarations but never modifies them.

### Interface Contract

The interface between GLM and Grok Build is the **registry directory structure** and the **JSON Schema definitions**. Grok Build:

1. Reads registry entries from `wtils/registry/`.
2. Validates entries against schemas from `wtils/schemas/`.
3. Compiles validated entries into executable pipelines.
4. Never writes back to the GLM layer. If a registry entry needs updating, the GLM layer is modified first, and Grok Build re-compiles.

This separation ensures that intelligence specifications are **version-controlled, auditable, and engine-agnostic**. The same GLM declarations could be compiled by a different build engine without modification.

## How to Validate Phase 1

Phase 1 validation is **entirely static** — it requires no runtime infrastructure, no API connections, and no data. Validation confirms that the registry foundation is internally consistent and complete.

### Step 1: Schema Validation

Every registry entry must conform to its JSON Schema:

```bash
# Validate all registry entries against their schemas
for registry in R1_profile R2_role R3_methodology R4_api R5_delivery R6_source R7_lifecycle R8_info_available_at_t; do
  for entry in wtils/registry/$registry/*.json; do
    ajv validate -s wtils/schemas/$registry.json -d "$entry"
  done
done
```

**Expected result**: All entries validate. Zero errors.

### Step 2: Referential Integrity

Every cross-registry reference must resolve:

- Every methodology's `api_dependencies` list contains only valid A00–A24 IDs.
- Every methodology's `governance_contracts` list contains only valid C01–C07 IDs.
- Every profile's `mandatory_methodologies` list contains only valid M01–M24 or C01–C07 IDs.
- Every composite methodology's `constituents` list contains only valid M01–M24 IDs.

**Expected result**: All references resolve. Zero dangling references.

### Step 3: Classification Consistency

- All M-series entries have classification `OFFICIAL_DIRECT` or `OFFICIAL_COMPOSITE`.
- All C-series entries have classification `WTILS_GOVERNANCE`.
- C05 has `callable: false`; all other entries have `callable: true`.
- C06 and C07 are declared as `scope: global`.
- No entry has classification `UNMAPPED_BLOCKED` (that is a derived classification, not a stored one).

**Expected result**: All classification constraints are satisfied.

### Step 4: Inter-Registry Constraint Validation

- P01 is the first-priority profile (priority = 1).
- P01 declares M01 as mandatory.
- Every OFFICIAL_COMPOSITE methodology has a non-empty `constituents` list.
- Every OFFICIAL_DIRECT methodology has an empty `constituents` list.
- A23 and A24 have status `PENDING_GROK_BUILD`; all others have status `ACTIVE`.
- Every lifecycle state machine includes all five standard states (DRAFT, REVIEW, PUBLISHED, DEPRECATED, ARCHIVED).
- No illegal lifecycle transitions are defined.

**Expected result**: All inter-registry constraints are satisfied.

### Step 5: Documentation Completeness

- Every registry (R1–R8) has a corresponding documentation file in `wtils/docs/`.
- Every entry referenced in documentation exists in the registry.
- No placeholder text remains in documentation files.

**Expected result**: Documentation is complete and consistent with registry entries.

### Validation Command

A single validation script is provided:

```bash
wtils validate --phase 1
```

This runs all five validation steps and produces a structured report:

```json
{
  "phase": 1,
  "version": "1.0.0",
  "timestamp": "2025-06-27T12:00:00Z",
  "results": {
    "schema_validation": { "status": "PASS", "entries_checked": 64, "errors": 0 },
    "referential_integrity": { "status": "PASS", "references_checked": 312, "errors": 0 },
    "classification_consistency": { "status": "PASS", "entries_checked": 31, "errors": 0 },
    "inter_registry_constraints": { "status": "PASS", "constraints_checked": 48, "errors": 0 },
    "documentation_completeness": { "status": "PASS", "docs_checked": 4, "errors": 0 }
  },
  "overall": "PASS"
}
```

## Repository Structure

```
wtils/
├── VERSION                          # Semantic version (1.0.0)
├── README.md                        # This file
├── docs/
│   ├── registry/README.md           # R1–R8 registry system documentation
│   ├── methodology/README.md        # R3 methodology registry documentation
│   ├── profile/README.md            # R1 profile system documentation
│   └── contracts/README.md          # Contract/version/lifecycle documentation
├── registry/                        # Registry entry files (Phase 1: schemas defined)
│   ├── R1_profile/
│   ├── R2_role/
│   ├── R3_methodology/
│   ├── R4_api/
│   ├── R5_delivery/
│   ├── R6_source/
│   ├── R7_lifecycle/
│   └── R8_info_available_at_t/
└── schemas/                         # JSON Schema definitions for each registry
    ├── R1_profile.json
    ├── R2_role.json
    ├── R3_methodology.json
    ├── R4_api.json
    ├── R5_delivery.json
    ├── R6_source.json
    ├── R7_lifecycle.json
    └── R8_info_available_at_t.json
```

## Next Steps (Phase 2)

Phase 2 (Grok Build) will:

1. Implement the registry resolution engine that consumes R1–R8.
2. Build the dependency graph constructor and topological sorter.
3. Implement API contract binding for A00–A22 (ACTIVE contracts).
4. Implement A23 (ML Model Serving) and A24 (Real-Time Streaming), transitioning them from PENDING_GROK_BUILD to ACTIVE.
5. Build the execution runtime and pipeline compiler.
6. Implement dynamic validation (runtime governance enforcement).
7. Implement the PIT retrieval system.

Phase 1 is the prerequisite: Grok Build cannot begin until the registry foundation is validated and complete.

## License

WTILS Phase 1 Registry Foundation is proprietary and confidential. All registry definitions, schemas, and documentation are the intellectual property of the WTILS project.
