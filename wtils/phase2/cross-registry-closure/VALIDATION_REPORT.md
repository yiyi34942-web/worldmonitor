# R5 Cross-Registry Closure Validation Report

Generated: 2026-10-02T05:26:51.725562Z

## Methodology Schema Conformance
- 31/31 strict schema conformant
- canonical_name removed (name IS canonical)
- methodology_version removed (version IS the field)
- rules_structured: all have rule_id + description
- thresholds_structured: all arrays
- freshness_requirement: canonical format (max_age_seconds/strategy/stale/degraded)
- source_requirements: all arrays of source IDs
- point_in_time_requirement: canonical format (required/as_of_field/default_lookback)
- Hashes: 31 unique, recomputable

## Profile Semantic Audit
- NONCALLABLE/META in core/triggered: 0
- GOVERNANCE only in audit: PASS
- Stale triggers removed: M09 cot, M10 yield_curve, M11 trade_flow, M16 supply_chain_stress, etc.

## Cross-Registry Binding Audit
- Role↔Method: PASS
- Profile applicability: PASS
- Role defaults executable: PASS

## Contract Version: 2.1.1 → 2.1.2
