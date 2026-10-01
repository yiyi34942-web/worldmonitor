# Profile Binding Report

## Profile-Role Bindings

| profile_id | profile_name | role_id | role_name | binding_type | default_prior |
|---|---|---|---|---|---|
| P01 | CRUDE_OIL | ENERGY | Energy Infrastructure & Reserves Analyst | PRIMARY | 0.4 |
| P01 | CRUDE_OIL | COMMODITY | Physical Commodity Analyst | PRIMARY | 0.35 |
| P01 | CRUDE_OIL | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.15 |
| P01 | CRUDE_OIL | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.1 |
| P02 | NATURAL_GAS_LNG | ENERGY | Energy Infrastructure & Reserves Analyst | PRIMARY | 0.45 |
| P02 | NATURAL_GAS_LNG | COMMODITY | Physical Commodity Analyst | PRIMARY | 0.35 |
| P02 | NATURAL_GAS_LNG | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.1 |
| P02 | NATURAL_GAS_LNG | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.1 |
| P03 | GOLD | COMMODITY | Physical Commodity Analyst | PRIMARY | 0.4 |
| P03 | GOLD | FINANCE | Financial System & Markets Analyst | PRIMARY | 0.4 |
| P03 | GOLD | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.2 |
| P04 | COPPER | COMMODITY | Physical Commodity Analyst | PRIMARY | 0.35 |
| P04 | COPPER | TECH | Technology Supply Chain Analyst | PRIMARY | 0.35 |
| P04 | COPPER | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.2 |
| P04 | COPPER | ENERGY | Energy Infrastructure & Reserves Analyst | SECONDARY | 0.1 |
| P05 | SOYBEAN | COMMODITY | Physical Commodity Analyst | PRIMARY | 0.5 |
| P05 | SOYBEAN | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.3 |
| P05 | SOYBEAN | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.2 |
| P06 | FX | FINANCE | Financial System & Markets Analyst | PRIMARY | 0.7 |
| P06 | FX | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.3 |
| P07 | RATES | FINANCE | Financial System & Markets Analyst | PRIMARY | 0.7 |
| P07 | RATES | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.3 |
| P08 | EQUITIES | FINANCE | Financial System & Markets Analyst | PRIMARY | 0.7 |
| P08 | EQUITIES | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.3 |
| P09 | AI_SUPPLY_CHAIN | TECH | Technology Supply Chain Analyst | PRIMARY | 0.4 |
| P09 | AI_SUPPLY_CHAIN | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.2 |
| P09 | AI_SUPPLY_CHAIN | COMMODITY | Physical Commodity Analyst | SECONDARY | 0.2 |
| P09 | AI_SUPPLY_CHAIN | ENERGY | Energy Infrastructure & Reserves Analyst | SECONDARY | 0.1 |
| P09 | AI_SUPPLY_CHAIN | WORLD | Geopolitical & Security Analyst | SECONDARY | 0.1 |
| P10 | GEOPOLITICAL_EVENT | WORLD | Geopolitical & Security Analyst | PRIMARY | 0.5 |
| P10 | GEOPOLITICAL_EVENT | ENERGY | Energy Infrastructure & Reserves Analyst | SECONDARY | 0.2 |
| P10 | GEOPOLITICAL_EVENT | COMMODITY | Physical Commodity Analyst | SECONDARY | 0.2 |
| P10 | GEOPOLITICAL_EVENT | FINANCE | Financial System & Markets Analyst | SECONDARY | 0.1 |

## Profile-Methodology Bindings

| profile_id | profile_name | methodology_id | methodology_name | binding_type |
|---|---|---|---|---|
| P01 | CRUDE_OIL | M15 | Commodity / Supply Vulnerability | CORE |
| P01 | CRUDE_OIL | M16 | Chokepoints | CORE |
| P01 | CRUDE_OIL | M20 | Energy Disruption Event Log | CORE |
| P01 | CRUDE_OIL | M03 | News Credibility | CORE |
| P01 | CRUDE_OIL | M17 | Pipeline Registry | TRIGGERED |
| P01 | CRUDE_OIL | M18 | Storage Facility | TRIGGERED |
| P01 | CRUDE_OIL | M19 | Fuel Shortage Alert | TRIGGERED |
| P01 | CRUDE_OIL | M21 | CII Risk Scoring | TRIGGERED |
| P01 | CRUDE_OIL | M23 | Thermal Escalation | TRIGGERED |
| P01 | CRUDE_OIL | C03 | Geographic Convergence | TRIGGERED |
| P01 | CRUDE_OIL | C04 | Strategic Risk | TRIGGERED |
| P01 | CRUDE_OIL | C06 | Decision-Signal Provenance | AUDIT |
| P01 | CRUDE_OIL | C07 | Source Attribution | AUDIT |
| P02 | NATURAL_GAS_LNG | M15 | Commodity / Supply Vulnerability | CORE |
| P02 | NATURAL_GAS_LNG | M17 | Pipeline Registry | CORE |
| P02 | NATURAL_GAS_LNG | M18 | Storage Facility | CORE |
| P02 | NATURAL_GAS_LNG | M20 | Energy Disruption Event Log | CORE |
| P03 | GOLD | M24 | Physical Precious-Metals Divergence Index | CORE |
| P03 | GOLD | M15 | Commodity / Supply Vulnerability | CORE |
| P03 | GOLD | M03 | News Credibility | CORE |
| P04 | COPPER | M14 | Mineral Production & Processing Concentration | CORE |
| P04 | COPPER | M15 | Commodity / Supply Vulnerability | CORE |
| P04 | COPPER | M16 | Chokepoints | CORE |
| P05 | SOYBEAN | M12 | Food Stocks & Stocks-to-Use | CORE |
| P05 | SOYBEAN | M15 | Commodity / Supply Vulnerability | CORE |
| P05 | SOYBEAN | M03 | News Credibility | CORE |
| P06 | FX | M08 | Financial System Exposure | CORE |
| P06 | FX | M10 | Five-Factor Country Scorecard | CORE |
| P06 | FX | M03 | News Credibility | CORE |
| P07 | RATES | M08 | Financial System Exposure | CORE |
| P07 | RATES | M10 | Five-Factor Country Scorecard | CORE |
| P07 | RATES | M03 | News Credibility | CORE |
| P08 | EQUITIES | M08 | Financial System Exposure | CORE |
| P08 | EQUITIES | M03 | News Credibility | CORE |
| P09 | AI_SUPPLY_CHAIN | M14 | Mineral Production & Processing Concentration | CORE |
| P09 | AI_SUPPLY_CHAIN | M13 | Defense Industrial Base | CORE |
| P09 | AI_SUPPLY_CHAIN | M16 | Chokepoints | CORE |
| P10 | GEOPOLITICAL_EVENT | M03 | News Credibility | CORE |
| P10 | GEOPOLITICAL_EVENT | M04 | Country Resilience Index | CORE |
| P10 | GEOPOLITICAL_EVENT | M23 | Thermal Escalation | CORE |
| P10 | GEOPOLITICAL_EVENT | M22 | Disease Outbreak Alert Level | CORE |
