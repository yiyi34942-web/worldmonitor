# WTILS Methodology Registry (R3)

## Overview

The Methodology Registry (R3) is the prescriptive heart of WTILS. It defines **31 entries**: **24 formal research methodologies** (M01–M24) and **7 governance contracts** (C01–C07). Each entry specifies *how* intelligence is produced — the steps, data requirements, validation criteria, and output schemas that must be followed for a result to be considered valid under that methodology.

## Formal Methodologies (M01–M24)

Formal methodologies are callable: they define executable procedures that transform input data into validated intelligence outputs.

| ID | Name | Classification | Description |
|----|------|----------------|-------------|
| M01 | Price Discovery | OFFICIAL_DIRECT | Spot and futures price analysis across exchanges, OTC markets, and official postings. Produces benchmark price assessments. |
| M02 | Supply Chain Mapping | OFFICIAL_DIRECT | Traces commodity flows from production to consumption, identifying bottlenecks, transit nodes, and inventory buffers. |
| M03 | Demand Forecasting | OFFICIAL_DIRECT | Models consumption demand using macro indicators, seasonal patterns, and substitution effects. |
| M04 | Inventory Analysis | OFFICIAL_DIRECT | Assesses visible and inferred stock levels at strategic storage points (Cushing, ARA, Fujairah, etc.). |
| M05 | Production Monitoring | OFFICIAL_DIRECT | Tracks output volumes, utilization rates, and maintenance schedules for production assets. |
| M06 | Geopolitical Risk Assessment | OFFICIAL_DIRECT | Evaluates political, regulatory, and conflict risks that may disrupt supply, demand, or transit. |
| M07 | Freight Rate Analysis | OFFICIAL_DIRECT | Analyzes tanker, bulk, and container freight rates as leading indicators of physical demand and supply imbalances. |
| M08 | Refinery Margin Analysis | OFFICIAL_DIRECT | Computes crack spreads, feedstock economics, and refinery utilization to infer crude demand and product supply. |
| M09 | Cross-Commodity Correlation | OFFICIAL_COMPOSITE | Identifies and quantifies correlations between the target commodity and related energy, metal, or financial instruments. |
| M10 | Seasonal Decomposition | OFFICIAL_DIRECT | Decomposes time series into trend, seasonal, and residual components to separate structural shifts from cyclical patterns. |
| M11 | Event Impact Analysis | OFFICIAL_DIRECT | Quantifies the price, supply, or demand impact of discrete events (force majeure, sanctions, policy changes). |
| M12 | Sentiment Analysis | OFFICIAL_DIRECT | Processes news, social media, and analyst commentary to produce directional sentiment scores. |
| M13 | Balance Table Construction | OFFICIAL_COMPOSITE | Assembles supply-demand balance tables from production, consumption, trade, and inventory data. |
| M14 | Satellite Imagery Analysis | OFFICIAL_DIRECT | Derives physical indicators (tank fill levels, crop health, activity intensity) from satellite and remote-sensing data. |
| M15 | Trade Flow Analysis | OFFICIAL_DIRECT | Analyzes customs data, bill of lading records, and vessel tracking to quantify bilateral and multilateral trade flows. |
| M16 | Forward Curve Construction | OFFICIAL_DIRECT | Builds forward price curves from futures, swaps, and OTC markets, incorporating carry, convenience yield, and term structure. |
| M17 | Volatility Surface Modeling | OFFICIAL_DIRECT | Constructs implied volatility surfaces from options data for risk quantification and derivative pricing. |
| M18 | Macro Indicator Integration | OFFICIAL_COMPOSITE | Fuses GDP, PMI, CPI, industrial production, and other macro indicators into commodity-specific demand drivers. |
| M19 | Counterparty Risk Assessment | OFFICIAL_DIRECT | Evaluates credit, operational, and sanctions risk of trading counterparties. |
| M20 | Regulatory Compliance Check | OFFICIAL_DIRECT | Validates that a trade, position, or reporting obligation complies with applicable regulations. |
| M21 | Historical Backtesting | OFFICIAL_COMPOSITE | Applies a methodology to historical data to validate its predictive or explanatory power. |
| M22 | Scenario Analysis | OFFICIAL_COMPOSITE | Constructs and evaluates discrete scenarios (base, bull, bear, black swan) under specified assumptions. |
| M23 | Arbitrage Detection | OFFICIAL_DIRECT | Identifies spatial, temporal, or quality arbitrage opportunities across markets and locations. |
| M24 | ESG Scoring | OFFICIAL_DIRECT | Computes environmental, social, and governance scores for commodities, producers, or trade flows. |

## Governance Contracts (C01–C07)

Governance contracts define the *rules* that formal methodologies must obey. They are non-executable in the traditional sense — they do not produce intelligence outputs — but they constrain how methodologies operate and how their outputs are validated.

| ID | Name | Classification | Callable | Description |
|----|------|----------------|----------|-------------|
| C01 | Data Quality | WTILS_GOVERNANCE | Yes | Defines minimum data quality thresholds (completeness, timeliness, accuracy) that input data must meet before a methodology may execute. |
| C02 | Provenance Tracking | WTILS_GOVERNANCE | Yes | Requires that every data point used in a methodology execution is traceable to its source, including transformation lineage. |
| C03 | Version Pinning | WTILS_GOVERNANCE | Yes | Enforces that all API calls, data sources, and methodology versions are explicitly pinned — no floating references allowed in production. |
| C04 | Audit Logging | WTILS_GOVERNANCE | Yes | Mandates that all methodology executions, state transitions, and data accesses are recorded in an immutable audit log. |
| C05 | Meta-Governance | WTILS_GOVERNANCE | **No** | The META contract that governs how other governance contracts are created, modified, and deprecated. C05 is **non-callable**: it cannot be invoked as a runtime check because it defines the schema and process for governance itself. |
| C06 | Global Privacy | WTILS_GOVERNANCE | Yes | Global contract enforcing privacy constraints across all methodologies. Requires PII redaction, access control, and data residency compliance. **Scope: global** — applies to every methodology execution regardless of profile. |
| C07 | Global Security | WTILS_GOVERNANCE | Yes | Global contract enforcing security constraints across all methodologies. Requires encryption at rest and in transit, authentication, and authorization. **Scope: global** — applies to every methodology execution regardless of profile. |

### Key Notes on Governance Contracts

- **C05 (Meta-Governance)** is the only non-callable entry in the entire registry. It exists to bootstrap and constrain the governance system itself. Changes to C01–C04 and C06–C07 must be proposed and approved through the process defined in C05.
- **C06 and C07 are global governance contracts.** Unlike C01–C04, which may be selectively applied based on methodology or profile, C06 and C07 apply unconditionally to every execution. There is no mechanism to exempt a methodology from C06 or C07.
- C01–C04 are **selectively applicable**: a methodology declares which of these governance contracts it must satisfy. A methodology that does not declare C01 (Data Quality), for instance, is not subject to data quality threshold checks — though it remains subject to C06 and C07 unconditionally.

## Classification System

Every methodology and governance contract carries a `classification` field that determines its treatment in Grok Build and validation:

### OFFICIAL_DIRECT

- **Definition**: A methodology that directly produces intelligence from input data using a single, well-defined procedure.
- **Examples**: M01 (Price Discovery), M06 (Geopolitical Risk Assessment), M14 (Satellite Imagery Analysis).
- **Grok Build behavior**: Can be independently compiled and executed. Produces a single output artifact.
- **Validation**: Must declare its input schema, output schema, and governance contracts (from C01–C04). Validated in isolation.

### OFFICIAL_COMPOSITE

- **Definition**: A methodology that orchestrates multiple OFFICIAL_DIRECT methodologies to produce a composite intelligence output.
- **Examples**: M09 (Cross-Commodity Correlation), M13 (Balance Table Construction), M22 (Scenario Analysis).
- **Grok Build behavior**: Cannot be independently compiled — requires its constituent direct methodologies to be resolved first. Produces a composite output that references its constituent outputs.
- **Validation**: Must declare its constituent methodologies, the composition logic, and the governance contracts applicable to each constituent (which may differ). Validated recursively: the composite is valid iff all constituents are valid *and* the composition logic is well-typed.

### WTILS_GOVERNANCE

- **Definition**: A governance contract that constrains methodology execution. Not a data-processing methodology.
- **Examples**: C01 (Data Quality), C05 (Meta-Governance), C06 (Global Privacy).
- **Grok Build behavior**: Treated as a validation gate, not an execution step. Applied before, during, or after methodology execution depending on the contract's phase declaration.
- **Validation**: Governance contracts are validated by checking that the target methodology's execution trace satisfies the contract's constraints. C05 is validated by checking that any governance change follows the C05-defined process.

### UNMAPPED_BLOCKED

- **Definition**: A classification assigned to methodology references that do not resolve to any known entry in R3. This can occur when:
  - A Profile references a methodology ID that does not exist.
  - A composite methodology references a constituent that has been deprecated and removed.
  - An external system references a WTILS methodology by an unrecognized identifier.
- **Examples**: Not an explicit entry — a *derived classification* assigned during Grok Build resolution.
- **Grok Build behavior**: Any UNMAPPED_BLOCKED reference causes the build to fail with a structured error indicating the unresolved reference and its source (which Profile or composite methodology referenced it).
- **Validation**: UNMAPPED_BLOCKED is always a validation failure. There is no mechanism to proceed with an unmapped methodology reference. The reference must either be corrected (point to an existing entry) or the entry must be added to the registry.

## Methodology Entry Schema

Every R3 entry conforms to the following schema:

```json
{
  "id": "M01",
  "name": "Price Discovery",
  "version": "1.0.0",
  "registry": "R3",
  "classification": "OFFICIAL_DIRECT",
  "callable": true,
  "input_schema": {
    "required": ["commodity", "date_range"],
    "optional": ["exchanges", "quality_grade"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "benchmark_price": { "type": "number" },
      "confidence_interval": { "type": "array", "items": { "type": "number" } }
    }
  },
  "governance_contracts": ["C01", "C02", "C03", "C04"],
  "api_dependencies": ["A01", "A03", "A07"],
  "constituents": [],
  "constraints": {
    "min_data_points": 30,
    "max_data_age_hours": 24,
    "requires_profile": ["P01", "P02"]
  },
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "author": "wtils-core"
  }
}
```

Key fields:

- **`callable`**: `true` for M01–M24 and C01–C04, C06–C07; `false` for C05.
- **`governance_contracts`**: The set of governance contracts (from C01–C04) that this methodology must satisfy. C06 and C07 are always implicitly included and need not be declared.
- **`api_dependencies`**: The set of R4 API contracts that this methodology requires.
- **`constituents`**: For OFFICIAL_COMPOSITE methodologies, the list of constituent methodology IDs. Empty for OFFICIAL_DIRECT.
- **`constraints`**: Methodology-specific execution constraints.

## Interactions with Other Registries

The Methodology Registry is deeply connected to every other registry:

| Registry | Interaction |
|----------|-------------|
| R1 (Profile) | Profiles whitelist/blacklist methodologies. A methodology may declare which profiles it supports (`requires_profile`). |
| R2 (Role) | Methodologies declare which roles are authorized to execute them. A `collector` role cannot execute M01; an `analyst` role can. |
| R4 (API) | Methodologies declare their API dependencies. Grok Build resolves and binds these before execution. |
| R5 (Delivery) | Methodologies declare their preferred delivery formats. M01 (Price Discovery) defaults to REST JSON; M14 (Satellite Imagery Analysis) defaults to S3 GeoTIFF. |
| R6 (Source) | Methodologies declare minimum source credibility tiers. M01 requires Tier 1 sources; M12 (Sentiment Analysis) accepts Tier 3. |
| R7 (Lifecycle) | Each methodology execution creates a lifecycle-tracked product. The methodology declares which lifecycle template to use. |
| R8 (InfoAvailableAtT) | Methodologies are subject to temporal availability. If required data is not available at time *T*, the methodology is deferred. |

## Summary

The Methodology Registry's 31 entries — 24 formal methodologies and 7 governance contracts — form the prescriptive backbone of WTILS intelligence production. The classification system (OFFICIAL_DIRECT, OFFICIAL_COMPOSITE, WTILS_GOVERNANCE, UNMAPPED_BLOCKED) determines how each entry is compiled, validated, and executed by Grok Build. The special status of C05 (META/non-callable) and the global scope of C06 and C07 ensure that governance is both self-consistent and universally applied.
