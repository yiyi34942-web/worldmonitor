# WTILS Contract Migration Notes (v1.0.0 → v2.0.0)

## Breaking Changes

### 1. profile_id → primary_profile_id + profile_ids

**Before:**
```json
{
  "profile_id": "P10"
}
```

**After:**
```json
{
  "primary_profile_id": "P10",
  "profile_ids": ["P10", "P01", "P02"]
}
```

**Rules:**
- `profile_ids` minItems=1, uniqueItems=true
- `primary_profile_id` must exist in `profile_ids`
- `profile_id` field removed from active schema
- Runtime evidence: Hormuz resolves P10, P01, P02 simultaneously

### 2. request_schema_ref → request_contract_ref + request_body_schema_ref

**Before:**
```json
{
  "request_schema_ref": null,
  "a06_request_schema_bound": true
}
```

**After:**
```json
{
  "request_contract_ref": "docs/api/AviationService.openapi.yaml#GetAirportOpsSummary:GET:/api/aviation/v1/get-airport-ops-summary",
  "request_body_schema_ref": null,
  "a06_request_schema_bound": "VERIFIED",
  "a06_request_schema_bound_semantic": "REQUEST_CONTRACT_BOUND"
}
```

**Rules:**
- `request_contract_ref` is REQUIRED for all 237 operations (never null)
- `request_body_schema_ref` is nullable (only set when operation has JSON body)
- A06 now means "request CONTRACT is bound", not "JSON body schema always exists"

### 3. legacy_classification → removed

**Before:**
```json
{
  "legacy_classification": "OFFICIAL_DIRECT",
  "provenance_class": "OFFICIAL",
  "execution_class": "DIRECT_API"
}
```

**After:**
```json
{
  "provenance_class": "OFFICIAL",
  "execution_class": "DIRECT_API"
}
```

**Rules:**
- `legacy_classification` field deleted from active schema and all 31 methodology entries
- Git history preserves old values for forensic reference
- Two-axis classification (`provenance_class` + `execution_class`) is the only authority

### 4. *_state_state → removed

**Before:** Keys like `a08_nullability_bound_state_state` existed alongside canonical `a08_nullability_bound_state`.

**After:** All 6162 duplicate `_state_state` keys removed. Only `aXX_...` and `aXX_..._state` remain.

### 5. PIT timestamp lineage → expanded

**Before:** Contract metadata timestamps only (as_of_time, created_at, valid_from, valid_to).

**After:** 13 observation lineage fields added:
- event_time, original_publish_time, source_observed_time, wm_first_seen_time
- webhook_emitted_time, webhook_received_time, normalized_time
- methodology_started_time, methodology_completed_time
- analyst_available_time, market_first_reaction_time
- research_snapshot_time, outcome_time

**Rules:**
- All nullable. Missing = null. Never fabricate.
- original_publish_time ≠ wm_first_seen_time
- source_observed_time ≠ retrieval time

### 6. delivery_semantics → primary_delivery_mode + cache_semantics

**Before:** Single `delivery_semantics_ref` field.

**After:** Two-axis delivery model:
- `primary_delivery_mode`: REQUEST, RELAY, SEED
- `cache_semantics`: CACHED_FETCH, NONE

Preserves the fact: "triggered by request, response may come from cache."

## Non-Breaking Changes

- A23/A24: remain PENDING_GROK_BUILD (no change)
- A03: remains VERIFIED from OpenAPI (no change)
- Source attribution: no invented precision from handlers
- Five Roles: frozen at {WORLD, TECH, FINANCE, COMMODITY, ENERGY}
- 31 Canonical Methodologies: frozen
- 237 Canonical API Operations: frozen
