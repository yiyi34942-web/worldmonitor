# WTILS Contract, Version, and Lifecycle System

## Overview

WTILS defines a rigorous contract/version/lifecycle system that governs every API interaction, data exchange, and product state transition. This system ensures that intelligence production is reproducible, traceable, and resilient to upstream changes. The core components are:

1. **API Contract Registry (A00–A24)**: Metadata coverage for every external and internal API consumed by WTILS.
2. **Lifecycle State Machine**: The state machine governing intelligence products from creation to archival.
3. **PIT (Point-in-Time) Contract**: The guarantee that any historical intelligence product can be exactly reproduced from the data and code that were available at the time of its creation.
4. **Data State Semantics**: The critical distinction between missing data and zero-valued data.

## API Contract Metadata (A00–A24)

The API Contract Registry (R4) defines metadata for every API endpoint that WTILS consumes. There are **25 contract slots** (A00–A24), each covering a specific API or API category:

| ID | Name | Status | Description |
|----|------|--------|-------------|
| A00 | Health Check | ACTIVE | Standard health/readiness probe for all APIs. Used by Grok Build to verify API availability before execution. |
| A01 | Spot Price | ACTIVE | Spot and assessment prices from exchanges and price reporting agencies. |
| A02 | Futures Curve | ACTIVE | Futures settlement prices, open interest, and volume across front-month and deferred contracts. |
| A03 | Options Surface | ACTIVE | Options strikes, implied volatility, Greeks, and open interest. |
| A04 | Inventories | ACTIVE | Strategic and commercial inventory levels at designated storage locations. |
| A05 | Production | ACTIVE | Production volumes, utilization rates, and maintenance schedules. |
| A06 | Trade Flows | ACTIVE | Customs data, bill of lading records, and bilateral trade statistics. |
| A07 | Freight Rates | ACTIVE | Tanker, dry bulk, and container freight rates and indices. |
| A08 | Refinery Data | ACTIVE | Refinery runs, yields, utilization, and maintenance turnarounds. |
| A09 | Weather Data | ACTIVE | Temperature, precipitation, wind, and tropical cyclone forecasts. |
| A10 | Geopolitical Events | ACTIVE | Political events, sanctions, regulatory changes, and conflict indicators. |
| A11 | News & Sentiment | ACTIVE | News articles, analyst reports, and computed sentiment scores. |
| A12 | Satellite Imagery | ACTIVE | Optical, SAR, and thermal satellite imagery metadata and retrieval endpoints. |
| A13 | Vessel Tracking | ACTIVE | AIS-based vessel positions, estimated arrivals, and fleet composition. |
| A14 | Currency & Rates | ACTIVE | FX rates, interest rates, and inflation indices. |
| A15 | Macro Indicators | ACTIVE | GDP, PMI, industrial production, CPI, and other macroeconomic series. |
| A16 | ESG Data | ACTIVE | Environmental, social, and governance scores and disclosures. |
| A17 | Carbon & Emissions | ACTIVE | Carbon prices, emission allowances, and compliance data. |
| A18 | Counterparty Data | ACTIVE | Counterparty identifiers, credit ratings, and sanctions screening results. |
| A19 | Regulatory Filings | ACTIVE | Official regulatory filings, licenses, and compliance records. |
| A20 | Historical Archives | ACTIVE | Long-term historical data for backtesting and trend analysis. |
| A21 | Internal Computed | ACTIVE | WTILS-internal computed series (derived indicators, model outputs, composite metrics). |
| A22 | Configuration | ACTIVE | WTILS configuration and registry metadata API (used by Grok Build itself). |
| A23 | ML Model Serving | PENDING_GROK_BUILD | Machine learning model inference endpoints. **Not yet built.** Will serve trained models for demand forecasting, anomaly detection, and scenario generation. |
| A24 | Real-Time Streaming | PENDING_GROK_BUILD | WebSocket and server-sent-event endpoints for real-time data streaming. **Not yet built.** Will provide sub-second market data and event feeds. |

### A23 and A24: PENDING_GROK_BUILD

A23 and A24 are the only contracts with `PENDING_GROK_BUILD` status. This means:

- **Their schemas are defined** (input/output contracts are specified), but **no concrete implementation exists yet**.
- **Methodologies that depend on A23 or A24 are marked as deferred** in Grok Build. They will compile but cannot execute until the Grok Build phase produces the concrete endpoints.
- **The PENDING status is tracked in R8 (InfoAvailableAtT)**: at time *T*, if A23 is still pending, any methodology requiring ML Model Serving will record `InfoAvailableAtT[A23] = false` and will be skipped or deferred.
- **Transition to ACTIVE**: Once Grok Build produces the A23/A24 implementations and they pass validation, their status transitions to `ACTIVE`. All deferred methodologies are then re-evaluated.

### Contract Metadata Schema

Each API contract entry includes:

```json
{
  "id": "A01",
  "name": "Spot Price",
  "version": "2.3.1",
  "status": "ACTIVE",
  "registry": "R4",
  "endpoint": {
    "base_url": "https://api.example.com/v2",
    "path": "/prices/spot",
    "method": "GET"
  },
  "auth": {
    "scheme": "oauth2_client_credentials",
    "scopes": ["prices:read"]
  },
  "rate_limits": {
    "requests_per_second": 10,
    "requests_per_day": 100000
  },
  "request_schema": {
    "commodity": { "type": "string", "required": true },
    "date": { "type": "string", "format": "date", "required": true },
    "location": { "type": "string", "required": false }
  },
  "response_schema": {
    "price": { "type": "number", "nullable": true },
    "unit": { "type": "string" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "as_of": { "type": "string", "format": "date-time" }
  },
  "data_state": {
    "missing_distinct_from_null": true,
    "default_for_missing": "SKIP",
    "zero_is_valid": true
  },
  "lifecycle": {
    "created": "2025-01-01T00:00:00Z",
    "last_validated": "2025-06-15T12:00:00Z",
    "deprecation_date": null
  },
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-06-15T12:00:00Z",
    "author": "wtils-core"
  }
}
```

## Lifecycle State Machine

Every intelligence product in WTILS follows a lifecycle governed by a state machine defined in R7. The standard lifecycle has five states and eight transitions:

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
  ┌─────────┐  submit  ┌─────────┐  approve  ┌───────────┐  deprecate  ┌───────────┐
  │  DRAFT  │ ───────▶ │ REVIEW  │ ────────▶ │ PUBLISHED │ ──────────▶ │ DEPRECATED│
  └─────────┘          └─────────┘           └───────────┘             └───────────┘
       │                    │                       │                        │
       │  reject            │  request_changes      │  supersede             │  archive
       ▼                    ▼                       ▼                        ▼
  ┌──────────┐         ┌──────────┐           ┌──────────┐           ┌──────────┐
  │ REJECTED │         │  DRAFT   │           │ ARCHIVED │           │ ARCHIVED │
  └──────────┘         └──────────┘           └──────────┘           └──────────┘
```

### States

| State | Description | Visibility | Mutability |
|-------|-------------|------------|------------|
| DRAFT | Initial creation state. Product is being produced. | Creator only | Full |
| REVIEW | Product is submitted for validation. Automated and human review gates apply. | Creator + Reviewers | Locked |
| PUBLISHED | Product has passed all review gates and is available to consumers. | All authorized users | Immutable (metadata only) |
| DEPRECATED | Product is superseded or no longer maintained. Still accessible but flagged. | All authorized users | Immutable |
| ARCHIVED | Product is moved to long-term storage. Accessible only via PIT retrieval. | PIT-authorized users | Immutable |
| REJECTED | Product failed review. Returned to creator for revision. | Creator only | Full (re-enter DRAFT) |

### Transitions

| From | To | Trigger | Governance Contract |
|------|----|---------|---------------------|
| DRAFT | REVIEW | `submit` | C04 (Audit Logging) records submission |
| REVIEW | PUBLISHED | `approve` | C01 (Data Quality) must pass; C04 records approval |
| REVIEW | DRAFT | `request_changes` | C04 records change request with reason |
| REVIEW | REJECTED | `reject` | C04 records rejection with reason |
| DRAFT | REJECTED | `reject` | C04 records rejection (e.g., failed pre-submission check) |
| PUBLISHED | DEPRECATED | `deprecate` | C04 records deprecation with successor reference |
| PUBLISHED | ARCHIVED | `supersede` | C04 records archival with superseding product reference |
| DEPRECATED | ARCHIVED | `archive` | C04 records archival after deprecation period |

### Illegal Transitions

The following transitions are **explicitly forbidden**:

- `DRAFT → PUBLISHED` (must go through REVIEW)
- `DRAFT → ARCHIVED` (must go through PUBLISHED or REJECTED)
- `PUBLISHED → DRAFT` (published products are immutable)
- `PUBLISHED → REVIEW` (re-review requires creating a new version)
- `ARCHIVED → *` (archival is terminal)
- `REJECTED → PUBLISHED` (must go through DRAFT → REVIEW)

Any attempt to perform an illegal transition is blocked by the lifecycle validator and recorded as a governance violation (C04).

### Fast-Track Lifecycle

For time-critical intelligence (e.g., event-driven alerts), a compressed lifecycle is available:

```
DRAFT → PUBLISHED → DEPRECATED → ARCHIVED
```

The REVIEW state is bypassed, but automated validation gates (C01, C06, C07) are still enforced. Fast-track is only available for products classified as `event_alert` or `flash_update`.

## PIT (Point-in-Time) Contract

The PIT contract is WTILS's reproducibility guarantee:

> **For any intelligence product P published at time T, the exact same product can be reproduced from the data, code, and registry state that were available at time T.**

### PIT Requirements

1. **Data snapshot**: Every input dataset used to produce P is snapshotted at time T. The snapshot is stored in an immutable, content-addressed store (e.g., S3 with versioning enabled).
2. **Code pin**: The exact code version (Git commit hash) that produced P is recorded in the product's metadata.
3. **Registry pin**: The exact versions of all R1–R8 registry entries that were active at time T are recorded. This includes API contracts (R4), methodology versions (R3), and profile configurations (R1).
4. **Environment pin**: The execution environment (runtime version, dependency versions, hardware spec) is recorded.

### PIT Retrieval

When a user requests a PIT reproduction:

1. The product's metadata is retrieved, including data snapshot references, code commit, and registry pins.
2. The data snapshots are restored from the content-addressed store.
3. The code is checked out at the recorded commit.
4. The registry is temporarily set to the pinned versions (using a virtual registry overlay).
5. The product is re-executed in a sandboxed environment matching the recorded spec.
6. The reproduced output is compared to the original output byte-for-byte. If they match, PIT verification succeeds. If they differ, a PIT violation is recorded.

### PIT and InfoAvailableAtT (R8)

The PIT contract is deeply connected to R8 (InfoAvailableAtT). At time T, R8 records what information was available — and crucially, what was *not* available. This means:

- A PIT reproduction does not include data that was not available at time T, even if it is available now.
- A PIT reproduction uses the same methodology and weights that were active at time T, even if the Profile has since been updated.
- A PIT reproduction may produce *lower quality* results than a current production run, because more data and better methodologies may be available now. This is correct and expected: PIT reproduces the *historical* product, not an *improved* version.

## Data State Semantics: Missing ≠ Zero

One of the most critical distinctions in WTILS is the semantic difference between **missing data** and **zero-valued data**.

### The Problem

In commodity intelligence, the distinction matters enormously:

- **Missing**: The data point was not reported, not collected, or not available at time T. We do not know the true value. Treating this as zero would be catastrophically wrong (e.g., treating an unreported production volume as zero production).
- **Zero**: The data point was explicitly reported as zero. The true value is zero (e.g., a storage facility reported zero inventory in its tanks).

### WTILS Data State Model

WTILS uses a three-valued logic for data fields:

| State | Representation | Meaning | Aggregation Behavior |
|-------|----------------|---------|---------------------|
| Present | `42.0` | The value is known and is 42.0 | Included in sums, averages, etc. |
| Zero | `0` | The value is known and is exactly 0 | Included in sums (adds 0), averages (counts as a data point) |
| Missing | `null` | The value is not known | **Excluded** from sums and averages; does not contribute to count |

### API Contract Enforcement

Every API contract (A00–A24) includes a `data_state` clause that specifies how missing vs. zero is handled:

```json
{
  "data_state": {
    "missing_distinct_from_null": true,
    "default_for_missing": "SKIP",
    "zero_is_valid": true
  }
}
```

- **`missing_distinct_from_null`**: When `true`, the API explicitly distinguishes between missing and null/zero in its response. When `false`, the API does not distinguish and WTILS must infer the semantics (this is flagged as a data quality issue under C01).
- **`default_for_missing`**: What WTILS should do when encountering a missing value:
  - `SKIP`: Exclude from aggregation (default and recommended).
  - `ZERO`: Treat as zero (dangerous; only used when the API contract explicitly guarantees that missing means zero).
  - `INTERPOLATE`: Use interpolation to estimate the value (only for time series with sufficient context).
  - `FAIL`: Raise an error and halt the methodology.
- **`zero_is_valid`**: When `true`, an explicit zero is a valid data point. When `false`, zero values are treated as suspect (flagged by C01) because the data source may be using zero as a sentinel for missing.

### Common Pitfalls

1. **Never sum a column that contains missing values without explicitly handling them.** In Python, `sum([1.0, None, 3.0])` raises `TypeError`. In SQL, `SUM` ignores NULLs silently. WTILS's aggregation layer enforces explicit missing-value handling.
2. **Never average a column treating missing as zero.** If 3 of 10 data points are missing, the average should be computed over 7 data points, not 10.
3. **Never use zero as a sentinel for missing.** If a field is not reported, it must be `null`, not `0`. API contracts that violate this are flagged by C01 and their `data_state.zero_is_valid` is set to `false`.
4. **Be especially careful with inventory data.** An unreported inventory is not zero inventory — it is unknown inventory. The difference between "empty tanks" and "we don't know how full the tanks are" is the difference between a bearish signal and no signal.

## Version System

### API Contract Versioning

API contracts follow semantic versioning (SemVer):

- **MAJOR** (X.*.*): Breaking change. The response schema is incompatible with previous versions. All methodologies depending on this API must be updated.
- **MINOR** (*.X.*): Additive change. New fields are added to the response schema. Existing fields are unchanged. Methodologies can optionally use new fields.
- **PATCH** (*.*.X): Bug fix or metadata change. No schema change. Fully backward compatible.

When an API contract version changes:

1. The new version is added to R4 alongside the old version (both are `ACTIVE` during transition).
2. Methodologies are migrated to the new version on their own schedule.
3. Once all methodologies have migrated, the old version is set to `DEPRECATED` with a 90-day deprecation period.
4. After the deprecation period, the old version is set to `ARCHIVED` and removed from active resolution.

### Product Versioning

Intelligence products follow a compound versioning scheme:

```
product_version = methodology_version.api_version.data_version
```

For example: `1.2.0.2.3.1.20250615` means:

- Methodology version: 1.2.0
- API version: 2.3.1
- Data snapshot date: 2025-06-15

This compound version enables PIT retrieval: given a product version, the exact methodology, API, and data can be reconstructed.

## Summary

The WTILS contract/version/lifecycle system provides the scaffolding for reliable, reproducible intelligence production. The API contract registry (A00–A24) covers every data source with explicit metadata, including the critical A23 and A24 slots pending Grok Build. The lifecycle state machine governs product state transitions with strict enforcement. The PIT contract guarantees reproducibility. And the data state semantics (missing ≠ zero) prevent one of the most common and dangerous errors in commodity data analysis.
