# WTILS Contract Migration 2.0.0 → 2.1.0

Generated: 2026-10-02T02:28:56.464075Z

## Non-Breaking Changes

1. All 31 methodology semantic payloads rebuilt with correct domain content
2. M21 CII: corrected from IMO Carbon Intensity to Country Instability/Intelligence
3. M06: corrected from military posture to indicator licensing
4. M07: corrected from humanitarian impact to known limitations
5. M09: removed COT Positioning from SWF core
6. M10: removed yield curve/recession from scorecard core
7. M11: removed trade flow from demographics core
8. Research Artifact schema: restored from 7 fields (regression) to 26 fields
9. Research Artifact methodologies[]: use provenance_class+execution_class
10. Research Artifact delta_t: structured with from_event/to_event/duration_ms/basis/confidence
11. Research Artifact PIT: 13 observation fields aligned to pit_contract v2
12. Patch evidence reaudit: 19 patches resolved with contract/static_code evidence
13. Methodology version: 1.0.0 → 1.1.0 with rebuilt semantic hashes
14. Methodology version hashes: rebuilt from new semantic payloads
