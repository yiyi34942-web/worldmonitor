# Method-API Binding Audit

For each methodology, lists bound operations with O/R/E/X/N classification and evidence.

## C01: CII Operator Overview
- provenance_class: OFFICIAL
- execution_class: NONCALLABLE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetRiskScores | R | IntelligenceService | GET |
| GetCountryRisk | R | IntelligenceService | GET |
| GetCountryIntelBrief | E | IntelligenceService | GET |
| GetRegionalSnapshot | E | IntelligenceService | GET |

## C02: Revision & Corrections
- provenance_class: OFFICIAL
- execution_class: NONCALLABLE

No API bindings.

## C03: Geographic Convergence
- provenance_class: OFFICIAL
- execution_class: COMPOSITE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListUnrestEvents | R | UnrestService | GET |
| ListMilitaryFlights | R | MilitaryService | GET |
| GetVesselSnapshot | R | MaritimeService | GET |
| ListEarthquakes | R | SeismologyService | GET |
| ListThermalEscalations | E | ThermalService | GET |
| ListFireDetections | E | WildfireService | GET |
| ListOrefAlerts | E | IntelligenceService | GET |
| ListInternetOutages | E | InfrastructureService | GET |

## C04: Strategic Risk
- provenance_class: OFFICIAL
- execution_class: COMPOSITE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetRiskScores | R | IntelligenceService | GET |
| ListCrossSourceSignals | E | IntelligenceService | GET |
| GetRegionalSnapshot | E | IntelligenceService | GET |
| GetTheaterPosture | E | MilitaryService | GET |
| ListSanctionsPressure | E | SanctionsService | GET |
| ListTemporalAnomalies | E | InfrastructureService | GET |
| ListFeedDigest | E | NewsService | GET |

## C05: Algorithms & Scoring
- provenance_class: OFFICIAL
- execution_class: META

No API bindings.

## C06: Decision-Signal Provenance
- provenance_class: OFFICIAL
- execution_class: GOVERNANCE

No API bindings.

## C07: Source Attribution
- provenance_class: OFFICIAL
- execution_class: GOVERNANCE

No API bindings.

## M01: China Activity Nowcast
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetChinaActivityNowcast | O | EconomicService | GET |
| GetChinaMacroSnapshot | R | EconomicService | GET |
| GetEnergyPrices | R | EconomicService | GET |
| ListCommodityQuotes | E | MarketService | GET |

## M02: News Digest & Briefing
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListFeedDigest | O | NewsService | GET |
| ListCountryHeadlines | O | NewsService | GET |
| GetSummarizeArticleCache | R | NewsService | GET |
| SummarizeArticle | E | NewsService | POST |

## M03: News Credibility
- provenance_class: OFFICIAL
- execution_class: COMPOSITE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListFeedDigest | R | NewsService | GET |
| ListCountryHeadlines | R | NewsService | GET |
| SearchGdeltDocuments | R | IntelligenceService | GET |
| ListCrossSourceSignals | E | IntelligenceService | GET |
| ListTelegramFeed | E | IntelligenceService | GET |
| ListXFeed | E | IntelligenceService | GET |
| GetSocialVelocity | E | IntelligenceService | GET |

## M04: Country Resilience Index
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetResilienceScore | O | ResilienceService | GET |
| GetResilienceRanking | O | ResilienceService | GET |
| GetCountryRisk | R | IntelligenceService | GET |
| GetRiskScores | R | IntelligenceService | GET |
| GetResilienceIndicators | E | ResilienceService | GET |

## M05: Resilience Indicators
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetResilienceIndicators | O | ResilienceService | GET |
| GetResilienceScore | R | ResilienceService | GET |
| GetDemographicsCapability | E | ResilienceService | GET |
| GetFoodStocks | E | ResilienceService | GET |

## M06: Resilience Indicator Licensing
- provenance_class: OFFICIAL
- execution_class: NONCALLABLE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetResilienceIndicators | R | ResilienceService | GET |

## M07: Known Limitations
- provenance_class: OFFICIAL
- execution_class: NONCALLABLE

No API bindings.

## M08: Financial System Exposure
- provenance_class: OFFICIAL
- execution_class: COMPOSITE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetBisCredit | R | EconomicService | GET |
| GetNationalDebt | R | EconomicService | GET |
| GetEconomicStress | R | EconomicService | GET |
| GetEuFsi | R | EconomicService | GET |
| GetBisExchangeRates | E | EconomicService | GET |
| GetBisPolicyRates | E | EconomicService | GET |
| GetCotPositioning | E | MarketService | GET |
| ListCommodityQuotes | E | MarketService | GET |

## M09: SWF Classification Rubric
- provenance_class: OFFICIAL
- execution_class: COMPOSITE

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetBisCredit | R | EconomicService | GET |
| ListWorldBankIndicators | R | EconomicService | GET |
| GetEconomicStress | E | EconomicService | GET |

## M10: Five-Factor Country Scorecard
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetFiveFactorScorecard | O | ScorecardService | GET |
| ListFiveFactorScorecards | O | ScorecardService | GET |
| GetCountryRisk | R | IntelligenceService | GET |
| GetRiskScores | R | IntelligenceService | GET |
| GetResilienceScore | E | ResilienceService | GET |

## M11: Demographics & Workforce Capability
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetDemographicsCapability | O | ResilienceService | GET |
| GetResilienceIndicators | R | ResilienceService | GET |
| ListWorldBankIndicators | E | EconomicService | GET |

## M12: Food Stocks & Stocks-to-Use
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetFoodStocks | O | ResilienceService | GET |
| GetOilStocksAnalysis | R | EconomicService | GET |
| GetFaoFoodPriceIndex | E | EconomicService | GET |
| ListCommodityQuotes | E | MarketService | GET |

## M13: Defense Industrial Base
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetDefenseIndustrialBase | O | MilitaryService | GET |
| ListMilitaryBases | R | MilitaryService | GET |
| ListDefensePatents | R | MilitaryService | GET |
| GetTheaterPosture | E | MilitaryService | GET |

## M14: Mineral Production & Processing Concentration
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetCriticalMinerals | O | SupplyChainService | GET |
| GetMineralProduction | O | SupplyChainService | GET |
| GetCountryVulnerabilities | R | SupplyChainService | GET |
| GetRiskScores | E | IntelligenceService | GET |

## M15: Commodity / Supply Vulnerability
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetCountryVulnerabilities | O | SupplyChainService | GET |
| ListVulnerabilityRankings | O | SupplyChainService | GET |
| GetEnergyPrices | R | EconomicService | GET |
| ListCommodityQuotes | R | MarketService | GET |
| GetOilStocksAnalysis | R | EconomicService | GET |
| GetChokepointStatus | E | SupplyChainService | GET |
| ListEnergyDisruptions | E | SupplyChainService | GET |

## M16: Chokepoints
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetChokepointStatus | O | SupplyChainService | GET |
| GetChokepointHistory | O | SupplyChainService | GET |
| GetCountryChokepointIndex | O | SupplyChainService | GET |
| GetChokepointDependencies | O | SupplyChainService | GET |
| GetVesselSnapshot | R | MaritimeService | GET |
| ListNavigationalWarnings | R | MaritimeService | GET |
| RouteIntelligence | R | ShippingV2Service | GET |
| GetShippingStress | R | SupplyChainService | GET |
| ListAcledEvents | E | ConflictService | GET |
| GetTheaterPosture | E | MilitaryService | GET |
| GetUSNIFleetReport | E | MilitaryService | GET |
| ListSanctionsPressure | E | SanctionsService | GET |
| ListCommodityQuotes | E | MarketService | GET |

## M17: Pipeline Registry
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListPipelines | O | SupplyChainService | GET |
| GetPipelineDetail | O | SupplyChainService | GET |
| GetEnergyPrices | R | EconomicService | GET |
| ListEnergyDisruptions | E | SupplyChainService | GET |

## M18: Storage Facility
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListStorageFacilities | O | SupplyChainService | GET |
| GetStorageFacilityDetail | O | SupplyChainService | GET |
| GetCrudeInventories | R | EconomicService | GET |
| GetNatGasStorage | R | EconomicService | GET |
| GetEuGasStorage | E | EconomicService | GET |

## M19: Fuel Shortage Alert
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListFuelShortages | O | SupplyChainService | GET |
| GetFuelShortageDetail | O | SupplyChainService | GET |
| GetCrudeInventories | R | EconomicService | GET |
| ListFuelPrices | R | EconomicService | GET |
| GetEnergyPrices | E | EconomicService | GET |

## M20: Energy Disruption Event Log
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListEnergyDisruptions | O | SupplyChainService | GET |
| GetEnergyPrices | R | EconomicService | GET |
| GetCountryEnergyProfile | R | IntelligenceService | GET |
| ListAcledEvents | E | ConflictService | GET |
| ListIranEvents | E | ConflictService | GET |

## M21: CII Risk Scoring
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetRiskScores | O | IntelligenceService | GET |
| GetCountryRisk | O | IntelligenceService | GET |
| ListCrossSourceSignals | R | IntelligenceService | GET |
| ListSecurityAdvisories | E | IntelligenceService | GET |
| ListCyberThreats | E | CyberService | GET |

## M22: Disease Outbreak Alert Level
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListDiseaseOutbreaks | O | HealthService | GET |
| ListCountryHeadlines | R | NewsService | GET |
| GetRiskScores | E | IntelligenceService | GET |

## M23: Thermal Escalation
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| ListThermalEscalations | O | ThermalService | GET |
| ListAcledEvents | R | ConflictService | GET |
| ListIranEvents | R | ConflictService | GET |
| ListUcdpEvents | R | ConflictService | GET |
| GetTheaterPosture | E | MilitaryService | GET |
| ListSanctionsPressure | E | SanctionsService | GET |

## M24: Physical Precious-Metals Divergence Index
- provenance_class: OFFICIAL
- execution_class: DIRECT_API

| operation_id | classification | service | http_method |
|---|---|---|---|---|
| GetPhysicalDivergenceIndex | O | MarketService | GET |
| GetPhysicalPremiums | O | MarketService | GET |
| GetGoldIntelligence | O | MarketService | GET |
| ListCommodityQuotes | R | MarketService | GET |
| GetCotPositioning | E | MarketService | GET |
