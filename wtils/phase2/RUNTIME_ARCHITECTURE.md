# WTILS Phase 2A Runtime Architecture

Phase 2A is the first Grok Build execution layer. It reads the Phase 1 registries and does not write them.

Baseline commit: `b0fea660506ae8bc4b1f8745952777d95cf01b00`

Branch: `wtils/phase2-runtime`

Host role for this run: `DEVELOPMENT_ONLY` on the current MacBook Air. Mac mini deployment, NAS mount, and multi-day stability stay `WAITING_HARDWARE`.

## Registry load

The loader resolves the repo root from the module URL. It does not pin a user home, a Mac mini address, a NAS address, or an Ollama path.

Eight registries:

| ID | Runtime key | File |
|----|-------------|------|
| R1 | profiles | `wtils/config/registries/profiles.json` |
| R2 | roles | `wtils/config/registries/roles.json` |
| R3 | methodologies | `wtils/config/registries/methodologies.json` |
| R4 | apis | `wtils/config/registries/apis.json` |
| R5 | delivery | `wtils/config/registries/delivery_semantics.json` |
| R6 | sources | `wtils/config/registries/sources.json` |
| R7 | contracts | `wtils/config/registries/contracts.json` |
| R8 | pit | `wtils/config/registries/pit_contract.json` |

Supporting reads: bindings, data states, intelligence catalog, outputs, and `wtils/schemas/research/research_artifact_schema.json`.

Fail closed: 5 roles, 31 methodologies, 10 profiles, 237 operations, A00–A22 present on every operation. Roles are only `WORLD`, `TECH`, `FINANCE`, `COMMODITY`, `ENERGY`.

`SYSTEM`, `ADMIN`, and `ORCHESTRATION` are scope classes. They are not roles.

## Pipeline

```
Input Resolver
  prompt | signal | hotspot | monitor | webhook | schedule
        → Intelligence Catalog Resolver
        → Profile Router
        → Five Role Router
        → Methodology Router
        → API Planner
        → Contract Resolver
        → Delivery Resolver
        → Source Resolver
        → Research Result
        → Output Router
```

Code: `src/wtils/registry.mjs`, `src/wtils/runtime.mjs`, `src/wtils/acceptance.mjs`.

### Methodology router

Execution classes come from the Phase 1 registry. IDs are not invented.

| Class | Runtime |
|-------|---------|
| DIRECT_API | Executable. Official (`O`) and required (`R`) bindings are planned. |
| COMPOSITE | Executable. The R/E binding graph is the plan. |
| NONCALLABLE | Recorded. Not executed. Not a tool. |
| META | Recorded. Not executed. Not a tool. |
| GOVERNANCE | Pipeline gate and trace. Not a callable tool. |

Binding letters map to planner levels: `O` → L0, `R` → L1, `E` → L2.

### API planner

Default levels are L0 and L1.

L2 opens only for high priority, an explicit deep flag, insufficient evidence, a contradiction, or a research request.

L3 is off. External gap adapters exist and `default_enabled` is false:

- `EVIDENCE_GAP` — Apify / original full text
- `MARKET_PRECISION_GAP` — exchange / tick / L2
- `RESEARCH_DOCUMENT_GAP` — reports / PDFs
- `REASONING_GAP` — Deeply / specialist model

Calling a gap adapter throws `EXTERNAL_GAP_DEFAULT_OFF`.

### Contract resolver

Each planned operation resolves canonical route, HTTP method, auth, entitlement, request schema, response schema, JMESPath, pagination, error semantics, lifecycle, role, methodology, profile, source state, and delivery state from `apis.json`.

Request and response schema refs in the registry are null. The resolver points at `docs/api/worldmonitor.openapi.yaml` by operationId. It does not copy a second API catalog. A null ref with `a06` marked bound is a non-blocking registry gap, recorded in `CONTRACT_CONFLICT_REPORT.md`.

Lifecycle other than `ACTIVE` drops the operation from the included plan.

### Delivery and source

Research results keep `delivery_mode`, `as_of`, `retrieved_at`, `cache_state`, `seed_state`, and `freshness_state`.

`SEEDED` and `SEED_FIRST_GAP` are not live exchange observations. `retrieved_at` stays null until a real read returns.

Source lineage fields are `original_publisher`, `observer`, `provider`, `host`, `transport`, and `collector`. Missing values stay null. The same publisher on two transports counts as one independent evidence item. Transport timestamps stay on the group.

### Point in time

Observation fields, all nullable:

`event_time`, `original_publish_time`, `source_observed_time`, `wm_first_seen_time`, `webhook_emitted_time`, `webhook_received_time`, `normalized_time`, `methodology_started_time`, `methodology_completed_time`, `analyst_available_time`, `market_first_reaction_time`, `research_snapshot_time`, `outcome_time`.

`original_publish_time` is not copied into `wm_first_seen_time`. A timestamp after `as_of` is excluded (`NO_LOOKAHEAD`). The registry PIT file still governs artifact metadata timestamps (`as_of_time`, `created_at`, `called_at`, and the rest). Those two lists are not the same. That gap is reported. It is not patched in the GLM registry.

### Research artifact

The builder emits an object that validates against `wtils/schemas/research/research_artifact_schema.json`.

Planned calls are evidence claims. `apis` stays empty until a call has a real `called_at`. No call time is invented.

The schema allows one `profile_id`. Additional resolved profiles are evidence claims. A schema change that stores every profile is proposed, not applied.

Persistence is an adapter:

- `memory` for tests
- `unconfigured` returns `QUEUED`
- `local-dev` names `WTILS_RESEARCH_ROOT` and does not choose Postgres, SQLite, DuckDB, Redis-only, or NAS-only

### Output router

Implemented: `LIVE_REPORT`, `DASHBOARD_STATE`, `RESEARCH_ARTIFACT`.

Stubs: `ALERT`, `WATCH_STATE`, `BACKTEST_ARTIFACT`, `KNOWLEDGE_PACKAGE`, `CURRICULUM_PACKAGE`, `TRAINING_SAMPLE`.

### WorldMonitor UI

No second dashboard and no standalone site. The integration contract points at the existing dashboard, `src/config/panels.ts`, and the `chat-analyst` panel (WM Analyst). Phase 2A does not edit those files.

### Agent adapters

Duties stay separate:

- Grok Bot — real-time intelligence / alert / fast report
- ChatGPT Dot — scheduled briefing / supervisory summary
- Codex — engineering agent

No Dot webhook is required in this phase.

### Storage and models

`NAS_PRESENT` defaults false. Realtime continues. Research persistence is `LOCAL_DEV` when `WTILS_RESEARCH_ROOT` is set, otherwise `QUEUED`. Knowledge promotion is `BLOCKED_STORAGE`. Large snapshots are `DEFERRED`. Absence of a NAS does not throw.

`OLLAMA_HOST` and `LLM_API_URL` are read from the environment. Unset stays null.

### Compose

`docker/wtils/compose.overlay.yml` is an extra compose file with profile `wtils-future`. It publishes no ports and does not replace Redis. The root `docker-compose.yml` is unchanged.

Future Redis on the compute host must be `7.2.x` with an exact digest. `deploy/wtils/redis-7.2.env` holds the placeholder `sha256:UNBOUND_UNTIL_HARDWARE_ACCEPTANCE`. The Air Redis processes are not replaced.

### A23 and A24

`src/wtils/acceptance.mjs` classifies every canonical operation.

Write, external notification, and ambiguous mutation classes are `NOT_SAFE_TO_CALL`. They are not sent.

Safe reads require an API key. With no key the status is `BLOCKED_AUTH`. Nothing is marked `LIVE_VERIFIED` without a real response.

A24 acceptance checks schema, required fields, missing-versus-zero, error semantics, freshness metadata, pagination, JMESPath, and exposed source or delivery evidence. HTTP 200 is not acceptance. With no live body, the official result is `BLOCKED`.

### What this phase does not do

It does not merge `main`, rebase Phase 1, amend the Phase 1 commit, force-push, or push to upstream.

It does not start Phase 2B.
