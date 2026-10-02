# FINAL_HORMUZ_E2E

primary_profile_id: P10
profile_ids: P10, P01, P02
roles: WORLD, FINANCE, COMMODITY, ENERGY
TECH: OFF

EXPECTED_FROM_REGISTRY selected:

- M03
- M15
- M16
- M20
- M21
- C03
- C04

ACTUAL_RUNTIME selected:

- M03
- M15
- M16
- M20
- M21
- C03
- C04

EXPECTED_FROM_REGISTRY governance:

- C06
- C07

ACTUAL_RUNTIME governance:

- C06
- C07

Selection match: YES

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

M21 country instability graph:

- L0 O GetCountryRisk included=true
- L0 O GetRiskScores included=true
- L1 R ListCrossSourceSignals included=true
- L2 E ListCyberThreats included=false
- L2 E ListSecurityAdvisories included=false

C03:

- L1 R GetVesselSnapshot included=true
- L1 R ListEarthquakes included=true
- L1 R ListMilitaryFlights included=true
- L1 R ListUnrestEvents included=true
- L2 E ListFireDetections included=false
- L2 E ListInternetOutages included=false
- L2 E ListOrefAlerts included=false
- L2 E ListThermalEscalations included=false

C04:

- L1 R GetRiskScores included=true
- L2 E GetRegionalSnapshot included=false
- L2 E GetTheaterPosture included=false
- L2 E ListCrossSourceSignals included=false
- L2 E ListFeedDigest included=false
- L2 E ListSanctionsPressure included=false
- L2 E ListTemporalAnomalies included=false

Sources: 24
Source verification states: {"SOURCE_HOST_UNKNOWN":5,"INFERRED":6,"UNKNOWN":13}
UNKNOWN rows with null publisher, provider, host, and transport: YES
PIT fields: 13
Digest repeat: YES
Schema errors: 0
