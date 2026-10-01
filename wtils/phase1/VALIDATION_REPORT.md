# WTILS Validation Report

Generated: 2026-10-01T17:58:36.834839Z

## Registry Counts

- **roles**: 5
- **methodologies**: 31
- **profiles**: 10
- **apis**: 237
- **sources**: 20
- **method_api_bindings**: 133
- **profile_methodology_bindings**: 41
- **role_methodology_bindings**: 25
- **scope_class_counts**: {'ANALYTICAL': 228, 'SYSTEM': 9}
- **execution_class_counts**: {'DIRECT_API': 19, 'COMPOSITE': 5, 'NONCALLABLE': 4, 'META': 1, 'GOVERNANCE': 2}
- **provenance_class_counts**: {'OFFICIAL': 31}
- **binding_semantic_counts**: {'O': 33, 'R': 50, 'E': 50}

## Five Roles

- **WORLD** — Geopolitical & Security Analyst
- **TECH** — Technology Supply Chain Analyst
- **FINANCE** — Financial System & Markets Analyst
- **COMMODITY** — Physical Commodity Analyst
- **ENERGY** — Energy Infrastructure & Reserves Analyst

## Methodology Execution Classes

- **COMPOSITE**: 5
- **DIRECT_API**: 19
- **GOVERNANCE**: 2
- **META**: 1
- **NONCALLABLE**: 4

## API Scope Classes

- **ANALYTICAL**: 228
- **SYSTEM**: 9

## A-Field Coverage Summary (23 fields × 237 ops)

| Field | VERIFIED | NOT_APPLICABLE | BLOCKED | PENDING | Total |
|-------|----------|----------------|---------|---------|-------|
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
| a11_delivery_bound | 119 | 0 | 118 | 0 | 237 |
| a12_seed_cache_bound | 119 | 0 | 118 | 0 | 237 |
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
