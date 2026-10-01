# PERSISTENCE_AUDIT

Question: which existing WorldMonitor stores can hold a WTILS research artifact, and which cannot.

DEDICATED_RESEARCH_STORE = JUSTIFIED

This phase does not deploy a database.

## What exists

- `server/worldmonitor/market/v1/premium-stock-store.ts` present — Redis stock analysis history and backtest store
- `src/services/storage.ts` present — IndexedDB worldmonitor_db baselines and snapshots
- `src/services/persistent-cache.ts` present — IndexedDB worldmonitor_persistent_cache
- `src/workers/vector-db.ts` present — IndexedDB worldmonitor_vector_store
- `convex/intelHistory.ts` present — Intel history with a 180 day prune
- `server/_shared/intel-history-client.ts` present — Intel history read client
- `scripts/seed-research.mjs` present — arXiv, Hacker News, and trending seed into Redis
- `docker-compose.yml` present — Upstream Redis service, unread and unmodified

Redis stock keys in `premium-stock-store.ts`:

- `market:stock-analysis-history:index:v5` and item keys, TTL 90 days, ledger limit 32
- `market:stock-backtest-store:v3`, TTL 30 days
- `market:stock-analysis-ledger`, TTL 90 days

Upstream compose Redis is `docker.io/redis:7-alpine`, requirepass, 256mb, allkeys-lru. Phase 2A did not change that service.

IndexedDB `worldmonitor_db` stores `baselines` and `snapshots` in the browser. `worldmonitor_persistent_cache` is a client cache. `worldmonitor_vector_store` is a local vector cache.

Intel history is a Convex table with embeddings, retraction, and `INTEL_HISTORY_RETENTION_DAYS = 180`. It is an evidence input, not the research artifact record.

`scripts/seed-research.mjs` fills Redis keys such as `research:arxiv:v1:*` and `research:hackernews:v1:*`. That is a seeded research feed, not an artifact with methodology versions, PIT lineage, contradictions, and promotion state.

## Reuse

These can feed an adapter:

- Dashboard panels can render `DASHBOARD_STATE` and `LIVE_REPORT`.
- Stock backtest Redis can be read as an input to a future `BACKTEST_ARTIFACT` stub. It is not the artifact store.
- Delivery mode `CACHE` can sit on the existing cache. A cache hit is not a research revision.
- Intel history can be cited as evidence. Its prune policy deletes rows.

## Cannot be the system of record

A research artifact needs the Phase 1 schema: profiles, roles, methodology versions, API contract trace, source lineage, delivery, as-of time, timeline, evidence, contradictions, unknowns, market reaction, delta, replay, backtest eligibility, confidence, promotion, and revision.

None of the stores above keep that object immutable, replayable at `as_of_time`, and free of TTL eviction. Redis `allkeys-lru` can drop a key. IndexedDB is per browser. Convex intel history prunes at 180 days. The arXiv seed is a feed cache.

## Requirement

Use a pluggable research-artifact repository. The engine stays unbound: not Postgres, not SQLite, not DuckDB, not Redis-only, not NAS-only.

The store must:

- persist the research artifact schema
- keep promotion and revision
- refuse to evict a promoted artifact on a cache TTL
- store null timestamps as null
- separate seeded delivery from live observation

Phase 2A ships the adapter interface and the memory / queued / local-dev states only.

