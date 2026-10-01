# HORMUZ_MOCK_E2E

Deterministic fixture: `wtils/phase2/fixtures/hormuz-disruption.json`.

Digest: `a7a1bc520f0bc23f66bcdfaacdb2754beed7f5e3acfdf05a4a861205bb88de4f`
Artifact validation: PASS

## Catalog

- IC_STRAIT_OF_HORMUZ

## Profiles

P10, P01, P02

## Roles

WORLD, FINANCE, COMMODITY, ENERGY. TECH is off. No sixth role.

## Methodologies

- M03 News Credibility 1.0.0 COMPOSITE executed
- M15 Commodity / Supply Vulnerability 1.0.0 DIRECT_API executed
- M16 Chokepoints 1.0.0 DIRECT_API executed
- M20 Energy Disruption Event Log 1.0.0 DIRECT_API executed
- M21 CII Risk Scoring 1.0.0 DIRECT_API executed
- C03 Geographic Convergence 1.0.0 COMPOSITE executed
- C04 Strategic Risk 1.0.0 COMPOSITE executed

Governance gates, not executed:

- C06 GOVERNANCE
- C07 GOVERNANCE

The other methodologies are not in this run.

## API plan

L2 open: false. L3: OFF.

| Level | Class | Method | Operation | HTTP | Route |
|-------|-------|--------|-----------|------|-------|
| L0 | O | M15 | GetCountryVulnerabilities | GET | /api/supply-chain/v1/get-country-vulnerabilities |
| L0 | O | M15 | ListVulnerabilityRankings | GET | /api/supply-chain/v1/list-vulnerability-rankings |
| L0 | O | M16 | GetChokepointDependencies | GET | /api/supply-chain/v1/get-chokepoint-dependencies |
| L0 | O | M16 | GetChokepointHistory | GET | /api/supply-chain/v1/get-chokepoint-history |
| L0 | O | M16 | GetChokepointStatus | GET | /api/supply-chain/v1/get-chokepoint-status |
| L0 | O | M16 | GetCountryChokepointIndex | GET | /api/supply-chain/v1/get-country-chokepoint-index |
| L0 | O | M20 | ListEnergyDisruptions | GET | /api/supply-chain/v1/list-energy-disruptions |
| L0 | O | M21 | GetCountryRisk | GET | /api/intelligence/v1/get-country-risk |
| L0 | O | M21 | GetRiskScores | GET | /api/intelligence/v1/get-risk-scores |
| L1 | R | C03 | GetVesselSnapshot | GET | /api/maritime/v1/get-vessel-snapshot |
| L1 | R | C03 | ListEarthquakes | GET | /api/seismology/v1/list-earthquakes |
| L1 | R | C03 | ListMilitaryFlights | GET | /api/military/v1/list-military-flights |
| L1 | R | C03 | ListUnrestEvents | GET | /api/unrest/v1/list-unrest-events |
| L1 | R | C04 | GetRiskScores | GET | /api/intelligence/v1/get-risk-scores |
| L1 | R | M03 | ListCountryHeadlines | GET | /api/news/v1/list-country-headlines |
| L1 | R | M03 | ListFeedDigest | GET | /api/news/v1/list-feed-digest |
| L1 | R | M03 | SearchGdeltDocuments | GET | /api/intelligence/v1/search-gdelt-documents |
| L1 | R | M15 | GetEnergyPrices | GET | /api/economic/v1/get-energy-prices |
| L1 | R | M15 | GetOilStocksAnalysis | GET | /api/economic/v1/get-oil-stocks-analysis |
| L1 | R | M15 | ListCommodityQuotes | GET | /api/market/v1/list-commodity-quotes |
| L1 | R | M16 | GetShippingStress | GET | /api/supply-chain/v1/get-shipping-stress |
| L1 | R | M16 | GetVesselSnapshot | GET | /api/maritime/v1/get-vessel-snapshot |
| L1 | R | M16 | ListNavigationalWarnings | GET | /api/maritime/v1/list-navigational-warnings |
| L1 | R | M16 | RouteIntelligence | GET | /api/v2/shipping/route-intelligence |
| L1 | R | M20 | GetCountryEnergyProfile | GET | /api/intelligence/v1/get-country-energy-profile |
| L1 | R | M20 | GetEnergyPrices | GET | /api/economic/v1/get-energy-prices |
| L1 | R | M21 | ListCrossSourceSignals | GET | /api/intelligence/v1/list-cross-source-signals |

## Point in time

- event_time: 2026-03-01T08:00:00Z
- original_publish_time: 2026-03-01T09:00:00Z
- wm_first_seen_time: null

First seen stays null. It is not copied from original publish time.

## Outputs

- sample delivery GetCountryVulnerabilities mode REQUEST retrieved_at null
- sample delivery ListVulnerabilityRankings mode REQUEST retrieved_at null
- sample delivery GetChokepointDependencies mode REQUEST retrieved_at null

- LIVE_REPORT: READY
- ALERT: STUB
- DASHBOARD_STATE: READY
- WATCH_STATE: STUB
- RESEARCH_ARTIFACT: READY
- BACKTEST_ARTIFACT: STUB
- KNOWLEDGE_PACKAGE: STUB
- CURRICULUM_PACKAGE: STUB
- TRAINING_SAMPLE: STUB

Research persistence state: MEMORY
Storage: realtime CONTINUE, knowledge BLOCKED_STORAGE, snapshot DEFERRED

External gap adapters on the plan are disabled.

