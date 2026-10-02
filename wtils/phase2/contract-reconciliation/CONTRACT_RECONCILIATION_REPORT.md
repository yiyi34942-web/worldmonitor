# WTILS Contract Reconciliation Report (Phase 2A-R)

Generated: 2026-10-02T02:06:24.343314Z

## Summary

- **286 patches reviewed**: ACCEPTED=286, REJECTED=0, DEFERRED=0
- **6162 duplicate _state_state keys removed**
- **legacy_classification removed** from 31 methodologies and schema
- **PIT observation lineage**: 13 timestamp fields added
- **Research Artifact multi-profile**: primary_profile_id + profile_ids
- **request_contract_ref**: 237/237 populated
- **Delivery semantics**: primary_delivery_mode + cache_semantics (two-axis)
- **Contract version**: 1.0.0 → 2.0.0 (breaking)

## A23/A24

- A23: all PENDING_GROK_BUILD (not LIVE_VERIFIED) ✅
- A24: all PENDING_GROK_BUILD (not ACCEPTED) ✅
- A03: unchanged (all VERIFIED from OpenAPI) ✅

## A-Field Coverage After Reconciliation

| Field | VERIFIED | NA | BLOCKED | PENDING | Total |
|-------|----------|----|---------|---------|-------|
| a00_registered | 237 | 0 | 0 | 0 | 237 |
| a01_http_method_verified | 237 | 0 | 0 | 0 | 237 |
| a02_canonical_route_verified | 237 | 0 | 0 | 0 | 237 |
| a03_auth_defined | 237 | 0 | 0 | 0 | 237 |
| a04_entitlement_bound | 237 | 0 | 0 | 0 | 237 |
| a05_declared_availability | 237 | 0 | 0 | 0 | 237 |
| a06_request_schema_bound | 237 | 0 | 0 | 0 | 237 |
| a07_response_schema_bound | 237 | 0 | 0 | 0 | 237 |
| a08_nullability_bound | 119 | 118 | 0 | 0 | 237 |
| a09_source_bound | 119 | 0 | 118 | 0 | 237 |
| a10_attribution_bound | 119 | 0 | 118 | 0 | 237 |
| a11_delivery_bound | 223 | 0 | 14 | 0 | 237 |
| a12_seed_cache_bound | 192 | 0 | 45 | 0 | 237 |
| a13_freshness_bound | 119 | 0 | 118 | 0 | 237 |
| a14_lifecycle_bound | 237 | 0 | 0 | 0 | 237 |
| a15_contract_version_bound | 237 | 0 | 0 | 0 | 237 |
| a16_role_bound | 237 | 0 | 0 | 0 | 237 |
| a17_methodology_bound | 237 | 0 | 0 | 0 | 237 |
| a18_profile_bound | 237 | 0 | 0 | 0 | 237 |
| a19_rate_limit_bound | 237 | 0 | 0 | 0 | 237 |
| a20_jmespath_bound | 225 | 12 | 0 | 0 | 237 |
| a21_pagination_truncation_bound | 45 | 192 | 0 | 0 | 237 |
| a22_error_semantics_bound | 237 | 0 | 0 | 0 | 237 |
