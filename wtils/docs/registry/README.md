# WTILS Registry System

## Overview

The WTILS Registry System is the foundational indexing and routing architecture of the World Trade Intelligence Layer System. It defines eight distinct registries (R1–R8) that collectively encode every dimension of intelligence production — from the *who* and *what* to the *how* and *when*. Each registry is a curated, version-controlled catalogue of entries that can be independently queried, cross-referenced, and composed.

## The Eight Registries

| ID | Registry | Purpose |
|----|----------|---------|
| R1 | Profile | Default routing templates that determine which downstream registries are activated for a given intelligence request. Profiles encode commodity-, region-, or theme-specific priorities. |
| R2 | Role | Functional roles that an agent or pipeline stage assumes (e.g., data collector, analyst, validator, publisher). Roles determine access rights and methodological constraints. |
| R3 | Methodology | Formal research methodologies (M01–M24) and governance contracts (C01–C07) that prescribe how intelligence is produced, validated, and governed. |
| R4 | API | External and internal API endpoints that supply raw or processed data. Each entry carries contract metadata (A00–A24) including version, authentication scheme, rate limits, and data-state semantics. |
| R5 | Delivery | Output formats, channels, and transport protocols through which finished intelligence products are distributed (e.g., REST JSON, S3 Parquet, WebSocket stream, email PDF). |
| R6 | Source | Provenance and credibility metadata for every data source consumed by R4 APIs. Sources are classified by reliability tier (Tier 1 official, Tier 2 commercial, Tier 3 crowdsourced/open). |
| R7 | Lifecycle | State-machine definitions for intelligence products: draft → review → published → deprecated → archived. Each state transition is governed by contracts from R3. |
| R8 | InfoAvailableAtT | The temporal availability registry — what information exists at time *T*. This registry captures the fundamental constraint that intelligence is always produced from incomplete data and records what was (and was not) knowable at each point in time. |

## The Composition Formula

The central insight of the WTILS Registry System is that a research result is not produced by a single pipeline but is the *product* of all eight registry dimensions acting together:

```
Research Result = Profile × Role × Methodology × API × Delivery × Source × Lifecycle × InfoAvailableAtT
                = R1       × R2   × R3          × R4  × R5       × R6    × R7       × R8
```

This is a **Cartesian product in the mathematical sense**: the space of all possible research outputs is the cross-product of the eight registry domains. A concrete research run selects one element from each registry, yielding a single point in that eight-dimensional space.

### Why Multiplication, Not Addition

- **Additive** models (pipeline step 1 + step 2 + …) assume independence and linear accumulation. They cannot represent the combinatorial explosion of valid configurations.
- **Multiplicative** models correctly represent that omitting any single dimension collapses the entire result to undefined. If `Methodology = ∅` or `InfoAvailableAtT = ∅`, no valid research output exists, regardless of how well the other dimensions are specified.
- The formula makes **validation** natural: a result is valid iff every factor is non-null and every inter-registry constraint is satisfied.

### Inter-Registry Constraints

Not every combination is legal. Cross-registry constraints enforce consistency:

1. **Profile → Methodology**: A Profile may whitelist or blacklist certain methodologies. For example, Profile P01 (CRUDE_OIL) requires M01 (Price Discovery) and forbids M14 (Satellite Imagery Analysis).
2. **Methodology → API**: Each methodology declares its required API contracts. If a required API is in lifecycle state `deprecated`, the methodology cannot execute.
3. **Role → Delivery**: Roles constrain which delivery channels are available. A `validator` role may only deliver to internal review channels, never to external publishing endpoints.
4. **Source × InfoAvailableAtT**: The temporal availability of a source constrains what information can be produced. If a source's data lag is 48 hours, InfoAvailableAtT records that the current window excludes that source's latest data.

## How Registries Are Consumed by Grok Build

Grok Build is the compilation phase that transforms WTILS registry specifications into executable intelligence pipelines. Its consumption model works as follows:

### 1. Registry Resolution

Given a research request tagged with a Profile (R1), Grok Build:

1. Loads the Profile entry from R1, which specifies default weights for R2 roles and R3 methodologies.
2. Resolves the weighted set of methodologies from R3, filtering by the Profile's whitelist/blacklist.
3. For each resolved methodology, loads its declared R4 API dependencies and R6 source requirements.
4. Checks each API and source against R8 (InfoAvailableAtT) to determine temporal availability. APIs or sources whose data is not available at time *T* are flagged and either substituted or the methodology is deferred.
5. Resolves R5 delivery targets based on the request's channel preferences and the resolved R2 roles' delivery constraints.
6. Instantiates an R7 lifecycle state machine for the resulting product.

### 2. Dependency Graph Construction

The resolved set of methodologies, APIs, and sources forms a directed acyclic graph (DAG). Grok Build topologically sorts this DAG and emits an execution plan:

```
[API fetch] → [Methodology apply] → [Role validate] → [Delivery publish]
```

Each node in the DAG is annotated with its registry provenance (which R1–R8 entries produced it), enabling full traceability.

### 3. Contract Binding

Before execution, Grok Build binds every API call (R4) to its contract metadata (A00–A24). This includes:

- **Version pinning**: The exact API version declared in the methodology is locked; no floating versions.
- **Authentication provisioning**: Credentials are injected from the secure vault based on the API's auth scheme.
- **Rate limit scheduling**: API calls are scheduled to respect per-endpoint rate limits.
- **Data-state defaults**: Missing fields are distinguished from zero-valued fields per the API's data-state semantics (see [Contracts documentation](../contracts/README.md)).

### 4. Validation Gate

Grok Build applies a validation gate before execution:

| Check | Registry | Condition |
|-------|----------|-----------|
| Profile completeness | R1 | All required methodologies are resolvable |
| Methodology closure | R3 | All transitive dependencies are present |
| API availability | R4, R8 | Every required API is available at time *T* |
| Source credibility | R6 | All sources meet the methodology's minimum tier |
| Lifecycle legality | R7 | The initial state transition is legal |
| Role authorization | R2 | The requesting role is authorized for all resolved operations |

If any check fails, the build is rejected with a structured error indicating which registry entry failed and why.

## Validation Approach

### Static Validation (Build Time)

Static validation occurs during Grok Build and checks the registry entries themselves:

- **Schema validation**: Every registry entry conforms to its JSON Schema definition (versioned in the repository).
- **Referential integrity**: Every cross-registry reference (e.g., a methodology referencing an API by ID) resolves to an existing entry in the target registry.
- **Constraint satisfaction**: All inter-registry constraints (listed above) are satisfied for the resolved configuration.

### Dynamic Validation (Run Time)

Dynamic validation occurs during intelligence production:

- **Contract compliance**: Every API response is validated against its declared contract (field presence, type, range). Failures are recorded in the product's lifecycle (R7).
- **Methodology adherence**: The executing pipeline follows the methodology's prescribed steps. Deviations (e.g., using an undeclared API) are flagged as violations.
- **Temporal freshness**: InfoAvailableAtT (R8) is continuously checked. If a source becomes stale mid-execution, the product is marked with a temporal warning.
- **Lifecycle transitions**: Every state transition in R7 is validated against the lifecycle state machine. Illegal transitions (e.g., `draft → archived` skipping `review`) are blocked.

### Continuous Validation (Background)

- **Registry drift detection**: If a registry entry is updated (e.g., an API contract changes), all Grok Build artifacts that depend on it are flagged for re-validation.
- **Source health monitoring**: R6 sources are periodically polled. A source that drops below its declared reliability tier triggers a re-evaluation of all methodologies that depend on it.
- **Lifecycle audit**: All R7 state transitions are logged to an immutable audit trail, enabling post-hoc compliance verification.

## Registry Storage and Versioning

Each registry is stored as a directory of JSON files, one per entry, under `wtils/registry/{R1-R8}/`. The directory structure is:

```
wtils/registry/
├── R1_profile/
│   ├── P01_crude_oil.json
│   ├── P02_lng.json
│   └── ...
├── R2_role/
│   ├── collector.json
│   ├── analyst.json
│   └── ...
├── R3_methodology/
│   ├── M01_price_discovery.json
│   ├── C01_data_quality.json
│   └── ...
├── R4_api/
│   ├── A00_health_check.json
│   ├── A01_spot_price.json
│   └── ...
├── R5_delivery/
│   ├── rest_json.json
│   ├── s3_parquet.json
│   └── ...
├── R6_source/
│   ├── eia_official.json
│   ├── ice_futures.json
│   └── ...
├── R7_lifecycle/
│   ├── standard.json
│   ├── fast_track.json
│   └── ...
└── R8_info_available_at_t/
    ├── source_lag_index.json
    └── temporal_window.json
```

Each entry file contains:

```json
{
  "id": "P01",
  "name": "CRUDE_OIL",
  "version": "1.0.0",
  "registry": "R1",
  "spec": { ... },
  "constraints": { ... },
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "author": "wtils-core"
  }
}
```

Versioning follows semantic versioning (MAJOR.MINOR.PATCH). A change to an entry's `spec` that breaks backward compatibility increments MAJOR; additive changes increment MINOR; metadata-only changes increment PATCH.

## Summary

The WTILS Registry System provides the declarative foundation for all intelligence production in WTILS. Its eight registries encode every dimension of the intelligence process, and their composition formula ensures that no dimension is accidentally omitted. Grok Build consumes these registries to produce validated, traceable, executable pipelines. The three-tier validation approach (static, dynamic, continuous) guarantees that intelligence products remain compliant throughout their lifecycle.
