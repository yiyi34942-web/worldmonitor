# Research Artifact Schema Audit

Generated: 2026-10-02T02:28:56.464075Z

## Top-level fields: 26

- **artifact_id**: Unique artifact identifier
- **artifact_version**: Artifact version (semver)
- **event_id**: Triggering event ID
- **created_at**: Artifact creation time
- **as_of_time**: Point-in-time the artifact represents
- **query**: Original query/intent text
- **intent**: Parsed intent
- **primary_profile_id**: Primary analysis profile (must be in profile_ids)
- **profile_ids**: All applicable profiles
- **roles**: Active role lenses
- **role_weights**: Role weight assignments
- **methodologies**: Methodology items with two-axis classification (no legacy classification)
- **apis**: API invocation records
- **sources**: Source records — all nullable, UNKNOWN preferred over invention
- **pit**: Point-in-time observation lineage (aligned to pit_contract v2)
- **timeline**: Event timeline entries
- **evidence**: Evidence records
- **contradictions**: Contradiction records between sources
- **unknowns**: Unknown/unresolved items
- **market_reaction**: Market reaction records
- **delta_t**: Inter-event timing deltas
- **replay**: Point-in-time replay capability
- **backtest**: Backtest results if applicable
- **confidence**: Overall confidence score
- **promotion_status**: Promotion status for WeKnora
- **revision**: Append-only revision chain

## Required fields: ['artifact_id', 'artifact_version', 'created_at', 'as_of_time', 'primary_profile_id', 'profile_ids', 'promotion_status']

## Regression check

- Phase 2A-R reduced schema to 7 fields (regression)
- Phase 2A-R2 restored to 26 fields (PASS)
- Multi-profile: primary_profile_id + profile_ids[] ✅
- PIT: 13 observation lineage fields aligned to pit_contract v2 ✅
- delta_t: from_event/to_event/duration_ms/basis/confidence ✅
- revision: append-only chain with previous_revision_ref ✅
- methodologies[]: provenance_class+execution_class, no legacy ✅
- sources[]: all nullable, UNKNOWN preferred ✅
