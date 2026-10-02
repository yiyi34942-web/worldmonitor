# WTILS Research Persistence Requirements

## Decision

DEDICATED_RESEARCH_STORE = JUSTIFIED
IMPLEMENTATION_TECHNOLOGY = UNBOUND

This phase does not deploy a database.

## Frozen Requirements

1. **Must persist Research Artifact contract** — Artifacts with methodology versions, PIT lineage, contradictions, and promotion state must survive restart.

2. **No TTL eviction for promoted artifact** — Once an artifact is promoted (e.g., from provisional to canonical), it must not be subject to TTL-based eviction. Only demotion can remove promotion status.

3. **Append/revision support** — Research artifacts support append-only revision chains. Each revision preserves the full PIT lineage.

4. **Point-in-time replay support** — Given a timestamp T, the system must reconstruct the research state as of T, including all artifact versions valid at T.

5. **Null timestamps remain null** — Missing observation timestamps are never fabricated. A null `original_publish_time` stays null through all pipeline stages.

6. **Seeded vs live observation separation** — Artifacts derived from seed/research scripts (e.g., `seed-research.mjs`) are tagged `observation_source=SEED`. Artifacts from live webhooks are tagged `observation_source=LIVE`. These are never conflated.

7. **NAS absence must not crash realtime layer** — If NAS is not present, the realtime layer continues to function. Research artifact persistence degrades to in-memory only. No `fs` or mount operations may throw unhandled exceptions.

8. **Portable Mac mini → Mac Studio** — The persistence layer must not depend on hardware-specific paths, GPU features, or memory sizes that differ between Mac mini and Mac Studio deployments.

## What Exists (Read-Only Reference)

- Redis: stock analysis (TTL 90d), backtest (TTL 30d) — suitable for ephemeral inputs only
- IndexedDB: browser-side baselines/snapshots — not server-side artifact storage
- Convex: intelHistory (180d retention) — evidence input, not artifact record
- `seed-research.mjs`: fills Redis keys with seeded research — not artifact with methodology versions

## What Does Not Exist

- No server-side artifact store with revision chains
- No PIT replay index
- No promotion state machine backed by durable storage
- No contradiction resolution log

## Next Phase Responsibility

Phase 2B or later: select implementation technology (Postgres, SQLite+NAS, DuckDB, etc.) and deploy.
