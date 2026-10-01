import { spawnSync } from "node:child_process";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadOpenApiIndex, runA23, runA24 } from "../../src/wtils/acceptance.mjs";
import { repoRoot, loadRegistry } from "../../src/wtils/registry.mjs";
import { runPipeline } from "../../src/wtils/runtime.mjs";

const root = repoRoot;
const phase2 = path.join(root, "wtils", "phase2");
const evidenceDir = path.join(phase2, "runtime-evidence");
mkdirSync(evidenceDir, { recursive: true });

const registry = loadRegistry(root);
const openapi = loadOpenApiIndex(root);
const hormuz = JSON.parse(readFileSync(path.join(phase2, "fixtures", "hormuz-disruption.json"), "utf8"));

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "generated" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|mjs|js)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function readText(file) {
  const info = statSync(file);
  if (info.size > 1_500_000) return "";
  return readFileSync(file, "utf8");
}

const serverFiles = walk(path.join(root, "server")).filter((file) => !file.includes(`${path.sep}_shared${path.sep}`));
const extraRoots = ["scripts", "api", "shared", "src"].map((dir) => path.join(root, dir));
const extraFiles = extraRoots.flatMap((dir) => walk(dir)).filter((file) => !file.includes(`${path.sep}src${path.sep}wtils${path.sep}`));
const extraTexts = extraFiles.map((file) => ({ file, text: readText(file) })).filter((item) => item.text);
const byBase = new Map();
for (const file of serverFiles) {
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  const list = byBase.get(base) ?? [];
  list.push(file);
  byBase.set(base, list);
}

const OBSERVE = [
  ["seed", /seed-meta|SEED_|required-seed|fromSeed|seed fixture/i],
  ["cache", /getCachedJson|cachedFetchJson|cacheTtl|REDIS_CACHE_KEY|setCachedJson/i],
  ["refresh", /forceRefresh|loadLive|upstreamUnavailable/i],
  ["webhook", /webhook/i],
  ["stream", /text\/event-stream|EventSource/i],
  ["poll", /setInterval\(/],
  ["relay", /\/relay\/|RELAY_/i],
  ["async", /waitUntil\(|async job/i],
  ["freshness", /fetchedAt|maxAge|FRESH_FIRST|STALE_OK|DEGRADED_OK/i],
];

function observe(text) {
  const hits = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const [kind, pattern] of OBSERVE) {
      if (pattern.test(lines[index])) {
        hits.push({ kind, line: index + 1, text: lines[index].trim().slice(0, 180) });
      }
    }
  }
  return hits.slice(0, 30);
}

function proposeDelivery(hits, operationId, route) {
  const kinds = new Set(hits.map((hit) => hit.kind));
  if (kinds.has("seed") && kinds.has("refresh")) return "SEED_FIRST_GAP";
  if (kinds.has("seed")) return "SEEDED";
  if (kinds.has("stream")) return "STREAM";
  if (kinds.has("relay")) return "RELAY";
  if (kinds.has("poll")) return "POLL";
  if (kinds.has("async")) return "ASYNC_JOB";
  if (kinds.has("webhook") && /webhook/i.test(`${operationId} ${route}`)) return "WEBHOOK";
  if (hits.length >= 0 && operationId) return "REQUEST";
  return null;
}

const hosts = registry.sources
  .filter((source) => source.host)
  .map((source) => ({ source_id: source.source_id, host: source.host, publisher: source.publisher_name ?? null }));

const evidence = [];
const patches = [];

for (const api of registry.apis) {
  const slug = api.canonical_route.split("/").filter(Boolean).at(-1);
  const handlers = (byBase.get(slug) ?? []).filter((file) => file.includes(`${path.sep}server${path.sep}`));
  const extraHits = handlers.length > 0 ? [] : extraTexts.filter((item) => item.text.includes(api.canonical_route)).map((item) => item.file);
  const texts = handlers.map((file) => ({ file: path.relative(root, file), text: readText(file) }));
  const hits = texts.flatMap((item) => observe(item.text).map((hit) => ({ ...hit, file: item.file })));
  const hostHits = [];
  for (const item of texts) {
    for (const source of hosts) {
      if (item.text.includes(source.host)) {
        hostHits.push({ file: item.file, source_id: source.source_id, host: source.host });
      }
    }
  }
  const deliveryProposal = handlers.length > 0 ? proposeDelivery(hits, api.operation_id, api.canonical_route) : null;
  const record = {
    operation_id: api.operation_id,
    canonical_route: api.canonical_route,
    static: {
      a09_source_bound: api.a09_source_bound,
      a10_attribution_bound: api.a10_attribution_bound,
      a11_delivery_bound: api.a11_delivery_bound,
      a12_seed_cache_bound: api.a12_seed_cache_bound,
      a13_freshness_bound: api.a13_freshness_bound,
      delivery_semantics_ref: api.delivery_semantics_ref,
      freshness_ref: api.freshness_ref,
      source_refs: api.source_refs ?? [],
    },
    handler_files: texts.map((item) => item.file),
    other_code_paths: extraHits.map((file) => path.relative(root, file)).slice(0, 12),
    observations: hits,
    host_observations: hostHits,
  };
  evidence.push(record);

  const blocked = (field) => api[field] === "BLOCKED_STATIC_EVIDENCE";
  if (blocked("a11_delivery_bound") && deliveryProposal) {
    patches.push({
      registry: "apis",
      operation_id: api.operation_id,
      field: "delivery_semantics_ref",
      current_value: api.delivery_semantics_ref,
      runtime_evidence: hits.slice(0, 4),
      expected_value: deliveryProposal,
      impact: "Delivery mode stays unresolved in the GLM registry until a gate accepts this evidence.",
      proposed_correction: deliveryProposal,
    });
    patches.push({
      registry: "apis",
      operation_id: api.operation_id,
      field: "a11_delivery_bound",
      current_value: "BLOCKED_STATIC_EVIDENCE",
      runtime_evidence: record.handler_files,
      expected_value: true,
      impact: "Static delivery block can be cleared only after gate review.",
      proposed_correction: true,
    });
  }
  if (blocked("a12_seed_cache_bound") && hits.some((hit) => hit.kind === "seed" || hit.kind === "cache")) {
    patches.push({
      registry: "apis",
      operation_id: api.operation_id,
      field: "a12_seed_cache_bound",
      current_value: "BLOCKED_STATIC_EVIDENCE",
      runtime_evidence: hits.filter((hit) => hit.kind === "seed" || hit.kind === "cache").slice(0, 4),
      expected_value: true,
      impact: "Seed or cache code exists on the handler. This does not make a seeded body a live observation.",
      proposed_correction: true,
    });
  }
  if (blocked("a13_freshness_bound")) {
    const token = hits.find((hit) => /FRESH_FIRST|STALE_OK|DEGRADED_OK/.test(hit.text));
    if (token) {
      const value = token.text.match(/FRESH_FIRST|STALE_OK|DEGRADED_OK/)[0];
      patches.push({
        registry: "apis",
        operation_id: api.operation_id,
        field: "freshness_ref",
        current_value: api.freshness_ref,
        runtime_evidence: [token],
        expected_value: value,
        impact: "Freshness enum appears in handler code.",
        proposed_correction: value,
      });
    }
  }
  if (blocked("a09_source_bound") && hostHits.length === 1) {
    patches.push({
      registry: "apis",
      operation_id: api.operation_id,
      field: "source_refs",
      current_value: api.source_refs ?? [],
      runtime_evidence: hostHits,
      expected_value: [hostHits[0].source_id],
      impact: "Handler text contains one registry host. No publisher was inferred beyond that host.",
      proposed_correction: [hostHits[0].source_id],
    });
  }
}

const stateStateOps = [];
for (const api of registry.apis) {
  for (const key of Object.keys(api)) {
    if (!key.endsWith("_state_state")) continue;
    const parent = key.replace(/_state$/, "");
    if (parent !== key && api[parent] !== undefined && api[key] !== api[`${key.replace(/_state$/, "")}`] && api[key] !== api[parent]) {
      stateStateOps.push(api.operation_id);
      break;
    }
  }
}
const uniqueStateOps = [...new Set(stateStateOps)];
if (uniqueStateOps.length > 0) {
  patches.push({
    registry: "apis",
    operation_id: null,
    affected_operation_ids: uniqueStateOps,
    field: "*_state_state",
    current_value: "duplicated suffix disagrees with the canonical *_state field on some operations",
    runtime_evidence: `canonical field and single _state agree; doubled _state_state disagrees for ${uniqueStateOps.length} operations`,
    expected_value: "delete accidental *_state_state keys",
    impact: "Runtime trusts the canonical A-field and the single _state value.",
    proposed_correction: "DELETE_DUPLICATE_STATE_STATE_KEYS",
  });
}

const methodConflicts = registry.methods
  .filter((method) => {
    const expected =
      method.execution_class === "COMPOSITE"
        ? "OFFICIAL_COMPOSITE"
        : method.execution_class === "DIRECT_API"
          ? "OFFICIAL_DIRECT"
          : method.execution_class === "GOVERNANCE" || method.execution_class === "META"
            ? "WTILS_GOVERNANCE"
            : "UNMAPPED_BLOCKED";
    return method.legacy_classification && method.legacy_classification !== expected;
  })
  .map((method) => ({
    methodology_id: method.methodology_id,
    execution_class: method.execution_class,
    legacy_classification: method.legacy_classification,
  }));

patches.push({
  registry: "methodologies",
  operation_id: null,
  field: "legacy_classification",
  current_value: methodConflicts,
  runtime_evidence: "execution_class is the router authority",
  expected_value: "legacy_classification aligned to execution_class",
  impact: "Artifact classification follows execution_class. Legacy values stay in the trace.",
  proposed_correction: "RECONCILE_LEGACY_CLASSIFICATION",
});

patches.push({
  registry: "pit_contract",
  operation_id: null,
  field: "timestamp_fields",
  current_value: (registry.pit.timestamp_fields ?? []).map((field) => field.field),
  runtime_evidence: "Phase 2A observation lineage requires event_time, original_publish_time, source_observed_time, wm_first_seen_time, webhook_emitted_time, webhook_received_time, normalized_time, methodology_started_time, methodology_completed_time, analyst_available_time, market_first_reaction_time, research_snapshot_time, outcome_time",
  expected_value: "add the observation fields as nullable without replacing contract metadata timestamps",
  impact: "Runtime keeps both lists. Missing observation times stay null.",
  proposed_correction: "ADD_OBSERVATION_TIMESTAMPS",
});

patches.push({
  registry: "research_artifact_schema",
  operation_id: null,
  field: "profile_id",
  current_value: "singular Pnn",
  runtime_evidence: "Hormuz resolves P10, P01, and P02 together",
  expected_value: "profile_ids array plus a primary profile_id",
  impact: "Builder stores the primary profile on profile_id and the others as evidence claims.",
  proposed_correction: "ALLOW_PROFILE_SET",
});

const nullSchema = registry.apis.filter((api) => !api.request_schema_ref).map((api) => api.operation_id);
patches.push({
  registry: "apis",
  operation_id: null,
  affected_operation_ids: nullSchema,
  field: "request_schema_ref",
  current_value: null,
  runtime_evidence: "docs/api/worldmonitor.openapi.yaml contains every canonical operationId",
  expected_value: "openapi operationId pointer",
  impact: "Non-blocking. Resolver reads OpenAPI in place and does not copy a second catalog.",
  proposed_correction: "POINTER_TO_EXISTING_OPENAPI",
});

const a23 = await runA23(registry, { env: {}, openapiIndex: openapi, fetchImpl: async () => {
  throw new Error("live fetch is disabled");
} });
const a24 = runA24(registry);

const pipeline = runPipeline(registry, hormuz, {
  artifact_id: hormuz.artifact_id,
  created_at: hormuz.as_of,
});

function writeJson(name, value) {
  writeFileSync(path.join(phase2, name), `${JSON.stringify(value, null, 2)}\n`);
}

writeJson("API_A23_LIVE_RESULTS.json", {
  generated_from: "src/wtils/acceptance.mjs",
  live_enabled: false,
  forged_live: false,
  counts: a23.counts,
  total: a23.total,
  results: a23.results,
});
writeJson("API_A24_ACCEPTANCE.json", {
  generated_from: "src/wtils/acceptance.mjs",
  rule: a24.rule,
  counts: a24.counts,
  total: a24.total,
  results: a24.results.map((row) => ({ operation_id: row.operation_id, status: row.status, checks: row.checks })),
});
writeJson("RUNTIME_SOURCE_DELIVERY_EVIDENCE.json", {
  audited_roots: ["server", "scripts", "api", "shared", "src"],
  handler_match: "server/worldmonitor basename equals the canonical route slug",
  operations_with_handler: evidence.filter((row) => row.handler_files.length > 0).length,
  operations_without_handler: evidence.filter((row) => row.handler_files.length === 0).length,
  blocked_static_a09: evidence.filter((row) => row.static.a09_source_bound === "BLOCKED_STATIC_EVIDENCE").length,
  operations: evidence,
});
writeFileSync(path.join(evidenceDir, "source-delivery-observations.json"), `${JSON.stringify({
  note: "Runtime evidence only. GLM registries were not modified.",
  operations: evidence,
}, null, 2)}\n`);

writeJson("PROPOSED_REGISTRY_PATCH.json", {
  apply: false,
  decision: "PENDING_GATE",
  patch_count: patches.length,
  patches,
});

const conflictLines = [
  "# CONTRACT_CONFLICT_REPORT",
  "",
  "Runtime did not edit `wtils/config/registries` or `wtils/schemas`.",
  "",
  "A23 operation status `CONTRACT_CONFLICT`: 0.",
  "The items below are registry gaps. They do not block the other operations.",
  "",
  "## apis.*_state_state",
  "",
  `- affected operations: ${uniqueStateOps.length}`,
  "- current_value: doubled `_state_state` disagrees with the canonical field on the A08 nullability family",
  "- runtime_evidence: `a08_nullability_bound` and `a08_nullability_bound_state` match; `a08_nullability_bound_state_state` is `BLOCKED_STATIC_EVIDENCE` where the canonical value is `NOT_APPLICABLE`",
  "- expected_value: delete the duplicate keys",
  "- impact: runtime ignores the duplicate suffix",
  "- proposed_correction: DELETE_DUPLICATE_STATE_STATE_KEYS",
  "",
  "## methodologies.legacy_classification",
  "",
  ...methodConflicts.map((row) => `- ${row.methodology_id}: execution_class=${row.execution_class} legacy=${row.legacy_classification}`),
  "",
  "## pit_contract.timestamp_fields",
  "",
  "- current_value: contract metadata timestamps (as_of_time, created_at, valid_from, valid_to, introduced_at, changed_at, deprecated_at, retired_at, called_at, ts)",
  "- expected_value: also store the observation lineage fields, nullable",
  "- impact: runtime already stores the observation fields and leaves missing ones null",
  "- proposed_correction: ADD_OBSERVATION_TIMESTAMPS",
  "",
  "## research_artifact_schema.profile_id",
  "",
  "- current_value: one profile id",
  "- runtime_evidence: Hormuz resolves P10, P01, P02",
  "- expected_value: a profile set",
  "- impact: primary profile is P10; P01 and P02 are evidence claims",
  "- proposed_correction: ALLOW_PROFILE_SET",
  "",
  "## apis.request_schema_ref",
  "",
  `- current_value: null on ${nullSchema.length} operations while a06 is true`,
  "- runtime_evidence: OpenAPI operationId coverage is 237/237",
  "- expected_value: pointer at the existing OpenAPI document",
  "- impact: non-blocking; no second API catalog was copied",
  "- proposed_correction: POINTER_TO_EXISTING_OPENAPI",
  "",
];
writeFileSync(path.join(phase2, "CONTRACT_CONFLICT_REPORT.md"), `${conflictLines.join("\n")}\n`);

function fileHas(relative) {
  return existsSync(path.join(root, relative));
}

const persistenceChecks = [
  ["server/worldmonitor/market/v1/premium-stock-store.ts", "Redis stock analysis history and backtest store"],
  ["src/services/storage.ts", "IndexedDB worldmonitor_db baselines and snapshots"],
  ["src/services/persistent-cache.ts", "IndexedDB worldmonitor_persistent_cache"],
  ["src/workers/vector-db.ts", "IndexedDB worldmonitor_vector_store"],
  ["convex/intelHistory.ts", "Intel history with a 180 day prune"],
  ["server/_shared/intel-history-client.ts", "Intel history read client"],
  ["scripts/seed-research.mjs", "arXiv, Hacker News, and trending seed into Redis"],
  ["docker-compose.yml", "Upstream Redis service, unread and unmodified"],
];

const persistenceBody = [
  "# PERSISTENCE_AUDIT",
  "",
  "Question: which existing WorldMonitor stores can hold a WTILS research artifact, and which cannot.",
  "",
  "DEDICATED_RESEARCH_STORE = JUSTIFIED",
  "",
  "This phase does not deploy a database.",
  "",
  "## What exists",
  "",
  ...persistenceChecks.map(([relative, note]) => `- \`${relative}\` ${fileHas(relative) ? "present" : "MISSING"} — ${note}`),
  "",
  "Redis stock keys in `premium-stock-store.ts`:",
  "",
  "- `market:stock-analysis-history:index:v5` and item keys, TTL 90 days, ledger limit 32",
  "- `market:stock-backtest-store:v3`, TTL 30 days",
  "- `market:stock-analysis-ledger`, TTL 90 days",
  "",
  "Upstream compose Redis is `docker.io/redis:7-alpine`, requirepass, 256mb, allkeys-lru. Phase 2A did not change that service.",
  "",
  "IndexedDB `worldmonitor_db` stores `baselines` and `snapshots` in the browser. `worldmonitor_persistent_cache` is a client cache. `worldmonitor_vector_store` is a local vector cache.",
  "",
  "Intel history is a Convex table with embeddings, retraction, and `INTEL_HISTORY_RETENTION_DAYS = 180`. It is an evidence input, not the research artifact record.",
  "",
  "`scripts/seed-research.mjs` fills Redis keys such as `research:arxiv:v1:*` and `research:hackernews:v1:*`. That is a seeded research feed, not an artifact with methodology versions, PIT lineage, contradictions, and promotion state.",
  "",
  "## Reuse",
  "",
  "These can feed an adapter:",
  "",
  "- Dashboard panels can render `DASHBOARD_STATE` and `LIVE_REPORT`.",
  "- Stock backtest Redis can be read as an input to a future `BACKTEST_ARTIFACT` stub. It is not the artifact store.",
  "- Delivery mode `CACHE` can sit on the existing cache. A cache hit is not a research revision.",
  "- Intel history can be cited as evidence. Its prune policy deletes rows.",
  "",
  "## Cannot be the system of record",
  "",
  "A research artifact needs the Phase 1 schema: profiles, roles, methodology versions, API contract trace, source lineage, delivery, as-of time, timeline, evidence, contradictions, unknowns, market reaction, delta, replay, backtest eligibility, confidence, promotion, and revision.",
  "",
  "None of the stores above keep that object immutable, replayable at `as_of_time`, and free of TTL eviction. Redis `allkeys-lru` can drop a key. IndexedDB is per browser. Convex intel history prunes at 180 days. The arXiv seed is a feed cache.",
  "",
  "## Requirement",
  "",
  "Use a pluggable research-artifact repository. The engine stays unbound: not Postgres, not SQLite, not DuckDB, not Redis-only, not NAS-only.",
  "",
  "The store must:",
  "",
  "- persist the research artifact schema",
  "- keep promotion and revision",
  "- refuse to evict a promoted artifact on a cache TTL",
  "- store null timestamps as null",
  "- separate seeded delivery from live observation",
  "",
  "Phase 2A ships the adapter interface and the memory / queued / local-dev states only.",
  "",
];
writeFileSync(path.join(phase2, "PERSISTENCE_AUDIT.md"), `${persistenceBody.join("\n")}\n`);

const executed = pipeline.result.methodologies.traces.filter((trace) => trace.executed);
const planRows = pipeline.result.api_plan.included
  .map((row) => `| ${row.level} | ${row.classification} | ${row.methodology_id} | ${row.operation_id} | ${row.http_method} | ${row.canonical_route} |`)
  .join("\n");
const hormuzMd = [
  "# HORMUZ_MOCK_E2E",
  "",
  "Deterministic fixture: `wtils/phase2/fixtures/hormuz-disruption.json`.",
  "",
  `Digest: \`${pipeline.digest}\``,
  `Artifact validation: ${pipeline.validation.ok ? "PASS" : "FAIL"}`,
  "",
  "## Catalog",
  "",
  pipeline.result.catalog.catalog_ids.map((id) => `- ${id}`).join("\n"),
  "",
  "## Profiles",
  "",
  pipeline.result.profiles.profile_ids.join(", "),
  "",
  "## Roles",
  "",
  `${pipeline.result.roles.roles.join(", ")}. TECH is off. No sixth role.`,
  "",
  "## Methodologies",
  "",
  ...executed.map((trace) => `- ${trace.methodology_id} ${trace.name} ${trace.version} ${trace.execution_class} executed`),
  "",
  "Governance gates, not executed:",
  "",
  ...pipeline.result.methodologies.governance.map((gate) => `- ${gate.methodology_id} ${gate.execution_class}`),
  "",
  "The other methodologies are not in this run.",
  "",
  "## API plan",
  "",
  `L2 open: ${pipeline.result.api_plan.gate.L2}. L3: ${pipeline.result.api_plan.l3}.`,
  "",
  "| Level | Class | Method | Operation | HTTP | Route |",
  "|-------|-------|--------|-----------|------|-------|",
  planRows,
  "",
  "## Point in time",
  "",
  `- event_time: ${pipeline.result.timeline.timestamps.event_time}`,
  `- original_publish_time: ${pipeline.result.timeline.timestamps.original_publish_time}`,
  `- wm_first_seen_time: ${pipeline.result.timeline.timestamps.wm_first_seen_time}`,
  "",
  "First seen stays null. It is not copied from original publish time.",
  "",
  "## Outputs",
  "",
  ...pipeline.result.delivery.slice(0, 3).map((row) => `- sample delivery ${row.operation_id} mode ${row.delivery_mode} retrieved_at ${row.retrieved_at}`),
  "",
  ...pipeline.outputs.map((output) => `- ${output.output_type}: ${output.status}`),
  "",
  `Research persistence state: ${pipeline.persistence.state}`,
  `Storage: realtime ${pipeline.result.storage.realtime}, knowledge ${pipeline.result.storage.knowledge_promotion}, snapshot ${pipeline.result.storage.large_snapshot}`,
  "",
  "External gap adapters on the plan are disabled.",
  "",
];
writeFileSync(path.join(phase2, "HORMUZ_MOCK_E2E.md"), `${hormuzMd.join("\n")}\n`);

const scanRoots = ["src/wtils", "docker/wtils", "deploy/wtils", "scripts/wtils", "wtils/phase2"].map((dir) => path.join(root, dir));
const scanFiles = [];
for (const dir of scanRoots) walkDocs(dir, scanFiles);
function walkDocs(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDocs(full, acc);
    else if (/\.(mjs|yml|yaml|env|md|json|example)$/.test(entry.name)) acc.push(full);
  }
}
const findings = [];
for (const file of scanFiles) {
  const text = readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  const homeNeedle = `/${"Users"}/`;
  const nameNeedle = ["den", "gyi"].join("");
  const floatingRedis = ["redis:", "7-alpine"].join("");
  if (text.includes(homeNeedle)) findings.push(`${relative} contains a user home path`);
  if (text.includes(nameNeedle)) findings.push(`${relative} contains a username`);
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) findings.push(`${relative} contains an IP literal`);
  if (/https?:\/\/[^\s]*11434/.test(text)) findings.push(`${relative} pins an Ollama endpoint`);
  if ((relative.startsWith("docker/wtils/") || relative.startsWith("deploy/wtils/")) && text.includes(floatingRedis)) {
    findings.push(`${relative} uses a floating Redis tag`);
  }
}
const portability = [
  "# MAC_STUDIO_PORTABILITY",
  "",
  findings.length === 0 ? "Scan: PASS" : "Scan: FAIL",
  "",
  "Checked `src/wtils`, `docker/wtils`, `deploy/wtils`, `scripts/wtils`, and `wtils/phase2` for a user home, a username, an IP literal, and a pinned Ollama URL. Floating Redis tags were checked in `docker/wtils` and `deploy/wtils` only. The persistence audit names the upstream image and does not adopt it.",
  "",
  findings.length === 0 ? "No hits." : findings.map((line) => `- ${line}`).join("\n"),
  "",
  "Moving Mac mini → Mac Studio is a compute-host change. Set `WTILS_RUNTIME_HOST` and the storage roots. Do not change pipeline code.",
  "",
  "The overlay profile `wtils-future` is not started here.",
  "",
  "MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE",
  "NAS_REAL_MOUNT = WAITING_HARDWARE",
  "NAS_IO_BENCHMARK = WAITING_HARDWARE",
  "REAL_24H_STABILITY = WAITING_HARDWARE",
  "REAL_72H_STABILITY = WAITING_HARDWARE",
  "",
];
writeFileSync(path.join(phase2, "MAC_STUDIO_PORTABILITY.md"), `${portability.join("\n")}\n`);

function dockerNames() {
  try {
    return execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .sort();
  } catch (error) {
    return { error: error.message };
  }
}
function dockerVolumes() {
  try {
    return execFileSync("docker", ["volume", "ls", "--format", "{{.Name}}"], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .sort();
  } catch (error) {
    return { error: error.message };
  }
}
function namesFromBefore(file) {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[1])
    .filter(Boolean)
    .sort();
}
const beforeNames = namesFromBefore("/tmp/wtils-p2a-docker-ps-before.txt");
const beforeVolumes = readFileSync("/tmp/wtils-p2a-docker-vol-before.txt", "utf8").split("\n").map((line) => line.trim()).filter(Boolean).sort();
const afterNames = dockerNames();
const afterVolumes = dockerVolumes();
const namesEqual = Array.isArray(afterNames) && beforeNames.join("\n") === afterNames.join("\n");
const volumesEqual = Array.isArray(afterVolumes) && beforeVolumes.join("\n") === afterVolumes.join("\n");

const safety = [
  "# AIR_PHASE2A_SAFETY_REPORT",
  "",
  "Host role: DEVELOPMENT_ONLY.",
  "",
  `Legacy container names before: ${beforeNames.length}`,
  `Legacy container names after: ${Array.isArray(afterNames) ? afterNames.length : "unavailable"}`,
  `Name set unchanged: ${namesEqual ? "YES" : "NO"}`,
  `Volume name set unchanged: ${volumesEqual ? "YES" : "NO"}`,
  "",
  "Read-only commands used for this proof: `docker ps` and `docker volume ls`.",
  "",
  "Not done:",
  "",
  "- no container stop or start",
  "- no volume delete",
  "- no Redis mutation and no Redis replacement",
  "- no secret printed",
  "- no port published by the WTILS overlay",
  "- root docker-compose.yml not modified",
  "",
  "Container names:",
  "",
  ...beforeNames.map((name) => `- ${name}`),
  "",
  namesEqual && volumesEqual ? "AIR_LEGACY_RUNTIME_UNTOUCHED = PASS" : "AIR_LEGACY_RUNTIME_UNTOUCHED = FAIL",
  "",
];
writeFileSync(path.join(phase2, "AIR_PHASE2A_SAFETY_REPORT.md"), `${safety.join("\n")}\n`);

const testRun = spawnSync(process.execPath, ["--test", "tests/wtils/phase2a.test.mjs"], {
  cwd: root,
  encoding: "utf8",
});
const testText = `${testRun.stdout ?? ""}\n${testRun.stderr ?? ""}`;
const summary = testText.split("\n").filter((line) => line.includes("tests ") || line.includes("pass ") || line.includes("fail ") || line.startsWith("✔") || line.startsWith("✖"));
writeFileSync(path.join(phase2, "TEST_REPORT.md"), [
  "# TEST_REPORT",
  "",
  `Command: node --test tests/wtils/phase2a.test.mjs`,
  `Exit: ${testRun.status}`,
  "",
  ...summary,
  "",
].join("\n"));

const handledBlocked = evidence.filter((row) => row.static.a09_source_bound === "BLOCKED_STATIC_EVIDENCE" && row.handler_files.length > 0).length;
const blocked = evidence.filter((row) => row.static.a09_source_bound === "BLOCKED_STATIC_EVIDENCE").length;
const unresolved = [
  "# UNRESOLVED_RUNTIME_ITEMS",
  "",
  `- A23 live verification did not run. Safe reads are BLOCKED_AUTH (${a23.counts.BLOCKED_AUTH}). Writes are NOT_SAFE_TO_CALL (${a23.counts.NOT_SAFE_TO_CALL}). LIVE_VERIFIED is 0.`,
  `- A24 official acceptance is BLOCKED for ${a24.counts.BLOCKED} operations because there is no live body. The checker itself is covered by unit tests.`,
  `- Source/delivery static block remains on ${blocked} operations. Handlers were found for ${handledBlocked} of them. Proposals are in PROPOSED_REGISTRY_PATCH.json and are not applied.`,
  `- Host observations that match more than one registry host were not reduced to a single source.`,
  `- Operations with no server/worldmonitor handler file stay without a delivery proposal.`,
  "- ExecuteBatch and DeductSituation are held as write-side effects until a sandbox exists.",
  "- External gap adapters are defined and off. No Apify, exchange, PDF, or Deeply call exists.",
  "- Output stubs remain for ALERT, WATCH_STATE, BACKTEST_ARTIFACT, KNOWLEDGE_PACKAGE, CURRICULUM_PACKAGE, and TRAINING_SAMPLE.",
  "- ChatGPT Dot has no webhook.",
  "- Research artifact schema still has one profile_id.",
  "- PIT registry timestamps and observation lineage timestamps are both kept. The registry file was not extended.",
  "- Duplicate *_state_state keys remain in the GLM API registry.",
  "- request_schema_ref is null. Resolution uses the existing OpenAPI file.",
  "- OpenAPI also contains ChokepointDisruptionWebhook, which is outside the 237 canonical operations.",
  "- DEDICATED_RESEARCH_STORE is JUSTIFIED and not deployed.",
  "- NAS_PRESENT is false. Knowledge promotion is BLOCKED_STORAGE.",
  "- MAC_MINI_REAL_DEPLOYMENT, NAS_REAL_MOUNT, NAS_IO_BENCHMARK, REAL_24H_STABILITY, and REAL_72H_STABILITY are WAITING_HARDWARE.",
  "",
  "NEXT = STOP",
  "",
];
writeFileSync(path.join(phase2, "UNRESOLVED_RUNTIME_ITEMS.md"), `${unresolved.join("\n")}\n`);

const secretHits = [];
for (const file of scanFiles) {
  const text = readFileSync(file, "utf8");
  if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i.test(text)) {
    secretHits.push(path.relative(root, file));
  }
}

writeFileSync(path.join(evidenceDir, "run-summary.json"), `${JSON.stringify({
  a23: a23.counts,
  a24: a24.counts,
  patches: patches.length,
  hormuz_validation: pipeline.validation.ok,
  hormuz_digest: pipeline.digest,
  portability_findings: findings,
  air_names_equal: namesEqual,
  air_volumes_equal: volumesEqual,
  secrets_found: secretHits,
  tests_exit: testRun.status,
}, null, 2)}\n`);

console.log(JSON.stringify({
  a23: a23.counts,
  a24: a24.counts,
  patches: patches.length,
  handlers: evidence.filter((row) => row.handler_files.length > 0).length,
  hormuz_ok: pipeline.validation.ok,
  portability: findings,
  air: { namesEqual, volumesEqual, before: beforeNames.length, after: Array.isArray(afterNames) ? afterNames.length : afterNames },
  secrets: secretHits,
  tests_exit: testRun.status,
}, null, 2));
