# HORMUZ_V2_1_E2E

Catalog: IC_STRAIT_OF_HORMUZ
primary_profile_id: P10
profile_ids: P10, P01, P02
roles: WORLD, FINANCE, COMMODITY, ENERGY
TECH: OFF

Executed methodologies:

- M03 COMPOSITE EXECUTED
- M15 DIRECT_API EXECUTED
- M16 DIRECT_API EXECUTED
- M20 DIRECT_API EXECUTED
- M21 DIRECT_API EXECUTED
- C03 COMPOSITE EXECUTED
- C04 COMPOSITE EXECUTED

Governance trace:

- C06 GOVERNANCE GOVERNANCE_TRACE
- C07 GOVERNANCE GOVERNANCE_TRACE

M16 chokepoint graph:

- L0 O GetChokepointDependencies included=true
- L0 O GetChokepointHistory included=true
- L0 O GetChokepointStatus included=true
- L0 O GetCountryChokepointIndex included=true
- L1 R GetShippingStress included=true
- L1 R GetVesselSnapshot included=true
- L1 R ListNavigationalWarnings included=true
- L1 R RouteIntelligence included=true
- L2 E GetTheaterPosture included=false
- L2 E GetUSNIFleetReport included=false
- L2 E ListAcledEvents included=false
- L2 E ListCommodityQuotes included=false
- L2 E ListSanctionsPressure included=false

M21 country risk graph:

- L0 O GetCountryRisk included=true
- L0 O GetRiskScores included=true
- L1 R ListCrossSourceSignals included=true
- L2 E ListCyberThreats included=false
- L2 E ListSecurityAdvisories included=false

C03 convergence graph:

- L1 R GetVesselSnapshot included=true
- L1 R ListEarthquakes included=true
- L1 R ListMilitaryFlights included=true
- L1 R ListUnrestEvents included=true
- L2 E ListFireDetections included=false
- L2 E ListInternetOutages included=false
- L2 E ListOrefAlerts included=false
- L2 E ListThermalEscalations included=false

C04 strategic graph:

- L1 R GetRiskScores included=true
- L2 E GetRegionalSnapshot included=false
- L2 E GetTheaterPosture included=false
- L2 E ListCrossSourceSignals included=false
- L2 E ListFeedDigest included=false
- L2 E ListSanctionsPressure included=false
- L2 E ListTemporalAnomalies included=false

PIT event_time: 2026-03-01T08:00:00Z
PIT original_publish_time: 2026-03-01T09:00:00Z
PIT wm_first_seen_time: null
PIT source_observed_time: null

wm_first_seen_time stays null. source_observed_time stays null.

- LIVE_REPORT: READY
- ALERT: STUB
- DASHBOARD_STATE: READY
- WATCH_STATE: STUB
- RESEARCH_ARTIFACT: READY
- BACKTEST_ARTIFACT: STUB
- KNOWLEDGE_PACKAGE: STUB
- CURRICULUM_PACKAGE: STUB
- TRAINING_SAMPLE: STUB

Persistence: MEMORY
Storage realtime: CONTINUE
Knowledge promotion: BLOCKED_STORAGE
Large snapshot: DEFERRED
Digest: 68660833b46ee3a36d147416d2a91b0ca2d4beccfb7ee9c8f30757bf5c9c7bce
