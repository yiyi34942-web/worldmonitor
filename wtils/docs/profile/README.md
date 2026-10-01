# WTILS Profile System (R1)

## Overview

The WTILS Profile System defines **10 Profiles** (P01–P10) that serve as **default routing templates** for intelligence requests. A Profile is *not* a fixed pipeline — it does not prescribe a rigid sequence of steps. Instead, it provides a weighted set of methodologies, roles, and data sources that the Grok Build compiler resolves into a concrete execution plan at build time.

This distinction is critical: **Profile = default routing template, not a fixed pipeline.**

## The 10 Profiles

| ID | Name | Commodity/Domain | Priority | Description |
|----|------|------------------|----------|-------------|
| P01 | CRUDE_OIL | Crude Oil | **1 (highest)** | The first-priority profile. Covers benchmark pricing (Dated Brent, WTI, Dubai), physical fundamentals (production, inventories, trade flows), and geopolitical risk. |
| P02 | LNG | Liquefied Natural Gas | 2 | Covers LNG spot/pricing (JKM, TTF, Henry Hub), liquefaction/regasification capacity, shipping, and long-term contract structures. |
| P03 | REFINED_PRODUCTS | Refined Petroleum Products | 3 | Covers gasoline, diesel/gasoil, jet fuel, naphtha, fuel oil. Emphasizes refinery margins and regional product balances. |
| P04 | NATURAL_GAS | Pipeline Natural Gas | 4 | Covers hub pricing, storage, pipeline flows, seasonal demand, and regulatory frameworks. |
| P05 | PETROCHEMICALS | Petrochemicals | 5 | Covers ethylene, propylene, BTX, and downstream derivatives. Links to crude and naphtha feedstock economics. |
| P06 | COAL | Coal | 6 | Covers thermal and metallurgical coal, shipping routes, environmental regulations, and substitution dynamics. |
| P07 | METALS | Base and Precious Metals | 7 | Covers copper, aluminum, iron ore, gold, silver. Emphasizes mine production, smelter capacity, and LME/COMEX pricing. |
| P08 | AGRICULTURE | Agricultural Commodities | 8 | Covers grains, oilseeds, softs. Emphasizes crop reports, weather models, and seasonal cycles. |
| P09 | SHIPPING | Maritime Freight | 9 | Covers tanker, dry bulk, and container freight. Emphasizes vessel supply, trade lanes, and freight as a cross-commodity indicator. |
| P10 | CARBON | Carbon & Emissions | 10 | Covers EU ETS, voluntary markets, compliance frameworks, and carbon intensity metrics. |

## Profile as Routing Template, Not Fixed Pipeline

A common misconception is that a Profile defines a fixed, sequential pipeline: "For crude oil, always do step 1 → step 2 → step 3." This is **not how WTILS Profiles work**.

### What a Profile *Does* Define

1. **Default methodology weights**: Which methodologies (from R3) are most relevant, and with what relative priority.
2. **Default role assignments**: Which roles (from R2) are authorized and what their default access patterns are.
3. **Default source preferences**: Which data sources (from R6) are preferred, and their minimum credibility tiers.
4. **Default delivery targets**: Which output formats and channels (from R5) are standard.
5. **Default lifecycle template**: Which lifecycle state machine (from R7) governs the product.
6. **Inter-registry constraints**: Which combinations of methodology, role, API, and source are legal for this profile.

### What a Profile *Does Not* Define

1. **Execution order**: The actual execution sequence is determined by Grok Build's dependency resolution, not by the Profile.
2. **Fixed API endpoints**: The Profile specifies API *contracts*, not specific endpoints. Grok Bind resolves contracts to concrete endpoints at build time.
3. **Hard failure modes**: If a preferred methodology's data is unavailable, the Profile's weights are *adjusted*, not ignored. The system degrades gracefully.
4. **Ad-hoc overrides**: A user request can override any Profile default. The Profile provides *defaults*, not *mandates*.

### The Routing Metaphor

Think of a Profile as a **routing table in a network**: it says "if the request is about crude oil, these are the most efficient paths through the registry space." But just as a routing table does not dictate the exact sequence of switches a packet traverses (that depends on real-time topology), a Profile does not dictate the exact sequence of methodology executions (that depends on real-time data availability and dependency resolution).

## Role Weighting System

The Profile's methodology and role weights are not static. They follow a **default prior + event-trigger adjustment** model:

### Default Prior

Each Profile defines a baseline set of weights. For P01 (CRUDE_OIL):

```json
{
  "methodology_weights": {
    "M01": 1.0,   // Price Discovery — always highest weight
    "M04": 0.9,   // Inventory Analysis
    "M05": 0.8,   // Production Monitoring
    "M06": 0.7,   // Geopolitical Risk Assessment
    "M02": 0.6,   // Supply Chain Mapping
    "M07": 0.5,   // Freight Rate Analysis
    "M08": 0.5,   // Refinery Margin Analysis
    "M15": 0.4,   // Trade Flow Analysis
    "M11": 0.3,   // Event Impact Analysis
    "M10": 0.3    // Seasonal Decomposition
  },
  "role_weights": {
    "collector": 0.3,   // Data collection is necessary but low-weight
    "analyst": 1.0,     // Analysis is the primary role
    "validator": 0.8,   // Validation is important for price discovery
    "publisher": 0.5    // Publishing is deferred until validation passes
  }
}
```

Weights are in the range [0.0, 1.0]. A weight of 0.0 means the methodology or role is not activated by default (but may be activated by an event trigger). A weight of 1.0 means maximum priority.

### Event-Trigger Adjustment

When a significant event is detected (via M11 Event Impact Analysis or an external signal), the Profile's weights are **adjusted**:

| Event Type | Weight Adjustment | Example |
|------------|-------------------|---------|
| Supply disruption | M02 +0.3, M06 +0.2, M04 +0.1 | OPEC production cut → elevate supply chain mapping and geopolitical risk |
| Price shock | M01 +0.0, M17 +0.3, M22 +0.2 | Sharp price move → elevate volatility and scenario analysis |
| Inventory surprise | M04 +0.3, M13 +0.2 | Unexpected stock build/draw → elevate inventory and balance table |
| Regulatory change | M20 +0.3, M06 +0.1 | New sanctions → elevate compliance and geopolitical risk |
| Infrastructure failure | M02 +0.3, M07 +0.2 | Pipeline outage → elevate supply chain and freight |
| Weather event | M10 +0.2, M14 +0.2 | Hurricane → elevate seasonal and satellite analysis |

Adjustments are **additive** on the default prior and are **clamped** to [0.0, 1.0]. They are **transient**: they decay exponentially back to the default prior with a half-life determined by the event type (typically 24–72 hours).

### Weight Resolution in Grok Build

When Grok Build resolves a Profile, it:

1. Reads the default prior weights.
2. Queries the event-trigger system for any active adjustments.
3. Applies adjustments: `effective_weight = clamp(default + adjustment, 0.0, 1.0)`.
4. Sorts methodologies by effective weight (descending).
5. Resolves the top-N methodologies, where N is determined by the request's budget and the Profile's `max_concurrent_methodologies` setting.

## P01 CRUDE_OIL — First Priority Profile

P01 (CRUDE_OIL) is the **first priority profile** in WTILS. This designation means:

1. **Development priority**: P01 is the first profile to be fully implemented, validated, and deployed. All other profiles reference P01 for shared components and patterns.
2. **Validation baseline**: The validation infrastructure (static, dynamic, continuous) is first tested against P01. P01 must pass all validation gates before any other profile enters production.
3. **Template role**: P01 serves as the template for other profiles. P02–P10 are derived by modifying P01's weights, constraints, and governance contracts, not by defining entirely new structures.
4. **Core methodology set**: P01 activates the following core methodologies by default:
   - M01 (Price Discovery) — weight 1.0
   - M04 (Inventory Analysis) — weight 0.9
   - M05 (Production Monitoring) — weight 0.8
   - M06 (Geopolitical Risk Assessment) — weight 0.7
5. **Core API contracts**: P01 depends on A01 (Spot Price), A03 (Futures), A04 (Inventories), A05 (Production), A06 (Trade Flows), A07 (Freight Rates).

### P01 Constraint Set

P01 defines the following inter-registry constraints:

- **M01 is mandatory**: Price discovery cannot be omitted for crude oil requests. Even if data is partially unavailable, M01 must execute (with degraded confidence intervals).
- **M06 is always active**: Geopolitical risk assessment is always weighted ≥ 0.5 for crude oil, regardless of event triggers, because geopolitical risk is a structural feature of crude oil markets.
- **M14 requires explicit enablement**: Satellite imagery analysis is not activated by default for P01 (weight 0.0) because it is expensive and specialized. It is activated only by an event trigger (e.g., infrastructure failure) or explicit user request.
- **C01 minimum data quality**: P01 requires C01 (Data Quality) with a minimum completeness of 80% and a maximum data age of 24 hours for M01 inputs.

## Profile Entry Schema

```json
{
  "id": "P01",
  "name": "CRUDE_OIL",
  "version": "1.0.0",
  "registry": "R1",
  "priority": 1,
  "methodology_weights": { ... },
  "role_weights": { ... },
  "default_lifecycle": "standard",
  "default_delivery": ["rest_json", "s3_parquet"],
  "constraints": {
    "mandatory_methodologies": ["M01"],
    "minimum_methodology_weights": { "M06": 0.5 },
    "disabled_methodologies": [],
    "requires_data_quality": { "completeness": 0.8, "max_age_hours": 24 }
  },
  "event_triggers": [ ... ],
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "author": "wtils-core"
  }
}
```

## Interactions with Other Registries

| Registry | Interaction |
|----------|-------------|
| R2 (Role) | Profiles weight roles. A collector role may have weight 0.3 in P01 but 0.7 in P08 (Agriculture, where data collection is more labor-intensive). |
| R3 (Methodology) | Profiles weight methodologies and declare mandatory/forbidden methodologies. |
| R4 (API) | Profiles declare default API contract preferences and fallback ordering. |
| R5 (Delivery) | Profiles declare default delivery targets and formats. |
| R6 (Source) | Profiles declare preferred sources and minimum credibility tiers. P01 requires Tier 1 for pricing data but accepts Tier 2 for freight. |
| R7 (Lifecycle) | Profiles declare the default lifecycle template for their products. |
| R8 (InfoAvailableAtT) | Profiles interact with temporal availability through the event-trigger system: if InfoAvailableAtT reports a data gap, the Profile's weights are adjusted to favor methodologies that can operate with reduced data. |

## Summary

The 10 WTILS Profiles are default routing templates that guide — but do not rigidly dictate — how Grok Build resolves and executes intelligence requests. The role weighting system (default prior + event-trigger adjustment) provides both stability and responsiveness. P01 (CRUDE_OIL) is the first priority profile, serving as the development baseline, validation reference, and structural template for all other profiles.
