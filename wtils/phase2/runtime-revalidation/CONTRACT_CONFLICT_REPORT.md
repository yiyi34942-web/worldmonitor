# CONTRACT_CONFLICT_REPORT

Registry and schema files were not modified.

## METHOD_PAYLOAD_NARRATIVE

Methodology canonical names and execution classes are current. Narrative payload fields still describe older domains. Runtime routes from canonical name, execution class, and the binding graph, and does not copy those payload fields.

- M01 China Activity Nowcast: classification_result, Classify event
- M02 News Digest & Briefing: anomaly_flags, temporal baseline
- M04 Country Resilience Index: intensity_score, ACLED
- M05 Resilience Indicators: network_graph, sanctions
- M09 SWF Classification Rubric: cot_data, COT
- M10 Five-Factor Country Scorecard: yield_data, curve_shape, inversion
- M11 Demographics & Workforce Capability: comtrade, flow_summary
- M13 Defense Industrial Base: dependency_map
- M14 Mineral Production & Processing Concentration: chokepoint_status, bypass
- M15 Commodity / Supply Vulnerability: technical_signals
- M16 Chokepoints: stress_index, bottleneck_map
- M21 CII Risk Scoring: cii_compliance_map, vessel_data
- M22 Disease Outbreak Alert Level: velocity_score, social_media_data
- C05 Algorithms & Scoring: META_ROUTER

## M21_CANONICAL_NAME

Registry canonical_name for M21 is CII Risk Scoring. The revalidation brief names the same method Country Instability / Intelligence Risk. Runtime keeps the registry name and plans GetRiskScores, GetCountryRisk, and ListCrossSourceSignals.


## DELIVERY_TWO_AXIS_UNBOUND

133 of 237 operations have a null primary_delivery_mode or cache_semantics. Runtime emits null. It does not copy delivery_semantics_ref into the two-axis fields.


## ARTIFACT_SCHEMA_DELIVERY_ENUM

The research artifact schema types primary_delivery_mode and cache_semantics as non-null enums. The Hormuz artifact keeps registry nulls, so schema validation reports 46 enum errors. Those nulls are not replaced.


## REQUEST_BODY_SCHEMA_UNBOUND

18 operations with a body have request_body_schema_ref null. Runtime resolves request_contract_ref for every operation and leaves the body ref null. The missing body ref is non-blocking.

