import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AGENT_ADAPTERS,
  FIVE_ROLES,
  UI_INTEGRATION,
  applyPit,
  classifyCall,
  classifyEntitlement,
  createPersistenceAdapter,
  evaluateA24,
  externalGapCatalog,
  levelGate,
  lineage,
  loadRegistry,
  modelEndpoints,
  repoRoot,
  resolveContract,
  resolveDelivery,
  routeMethodologies,
  routeProfiles,
  routeRoles,
  runA23,
  runPipeline,
  storagePolicy,
} from "../../src/wtils/index.mjs";

const registry = loadRegistry();
const hormuz = JSON.parse(
  readFileSync(path.join(repoRoot, "wtils/phase2/fixtures/hormuz-disruption.json"), "utf8"),
);

function hormuzInput(extra = {}) {
  return { ...hormuz, ...extra, timestamps: { ...hormuz.timestamps, ...(extra.timestamps ?? {}) } };
}

test("registry runtime load", () => {
  assert.equal(registry.roles.length, 5);
  assert.deepEqual(registry.roles.map((role) => role.role_id), [...FIVE_ROLES]);
  assert.equal(registry.methods.length, 31);
  assert.equal(registry.profiles.length, 10);
  assert.equal(registry.apis.length, 237);
  assert.equal(registry.loaded.roles.registry_id, "R2");
  assert.equal(registry.loaded.pit.registry_id, "R8");
  assert.ok(registry.researchArtifactSchema.required.includes("as_of_time"));
  assert.ok(registry.apis.every((api) => "a22_error_semantics_bound" in api));
});

test("five-role enforcement rejects a sixth role and scope classes", () => {
  const profiles = routeProfiles(registry, { explicit_profiles: ["P01"] }, { matches: [] });
  const routed = routeRoles(registry, { explicit_roles: ["WORLD", "INFRASTRUCTURE", "ADMIN", "SYSTEM"], triggers: [] }, profiles);
  assert.deepEqual(routed.roles, ["WORLD"]);
  assert.ok(routed.rejected.some((item) => item.role_id === "INFRASTRUCTURE"));
  assert.ok(routed.rejected.some((item) => item.role_id === "SYSTEM"));
});

test("profile routing preserves explicit profiles and drops unknown ids", () => {
  const routed = routeProfiles(
    registry,
    { explicit_profiles: ["P10", "P99", "P01", "P02"] },
    { matches: [] },
  );
  assert.deepEqual(routed.profile_ids, ["P10", "P01", "P02"]);
  assert.deepEqual(routed.unknown, ["P99"]);
});

test("role router keeps TECH off unless the event trigger is present", () => {
  const profiles = routeProfiles(registry, { explicit_profiles: ["P10", "P01", "P02"], triggers: [] }, { matches: [] });
  const off = routeRoles(registry, { explicit_roles: [], triggers: [] }, profiles);
  assert.deepEqual(off.roles, ["WORLD", "FINANCE", "COMMODITY", "ENERGY"]);
  assert.equal(off.roles.includes("TECH"), false);
  const on = routeRoles(
    registry,
    { explicit_roles: [], triggers: ["ai_supply_chain_disruption"] },
    profiles,
  );
  assert.equal(on.roles.includes("TECH"), true);
});

test("method routing uses registry ids and does not execute noncallable or meta", () => {
  const profiles = routeProfiles(registry, { explicit_profiles: ["P10"] }, { matches: [] });
  const routed = routeMethodologies(
    registry,
    { explicit_methodologies: ["M06", "C05", "C06", "M15"], triggers: [] },
    profiles,
  );
  const byId = Object.fromEntries(routed.traces.map((trace) => [trace.methodology_id, trace]));
  assert.equal(byId.M06.executed, false);
  assert.equal(byId.M06.execution_class, "NONCALLABLE");
  assert.equal(byId.C05.executed, false);
  assert.equal(byId.C05.execution_class, "META");
  assert.equal(byId.C06.executed, false);
  assert.equal(byId.M15.executed, true);
  assert.equal(routed.traces.some((trace) => trace.methodology_id === "M99"), false);
});

test("method API graph keeps composite R edges on L1 and E edges off by default", () => {
  const run = runPipeline(registry, hormuzInput());
  const m03 = run.result.api_plan.operations.filter((operation) => operation.methodology_id === "M03");
  assert.ok(m03.some((operation) => operation.operation_id === "ListFeedDigest" && operation.level === "L1" && operation.included));
  assert.ok(m03.some((operation) => operation.classification === "E" && operation.included === false && operation.block_reason === "LEVEL_GATE"));
  assert.equal(m03.some((operation) => operation.classification === "E" && operation.included), false);
  assert.equal(run.result.api_plan.gate.L2, false);
  assert.equal(run.result.api_plan.l3, "OFF");
});

test("API planner opens L2 only for the declared gates", () => {
  assert.equal(levelGate({ priority: "normal", deep: false, evidence_insufficient: false, contradiction: false, research_request: false }).L2, false);
  for (const patch of [
    { priority: "high" },
    { deep: true },
    { evidence_insufficient: true },
    { contradiction: true },
    { research_request: true },
  ]) {
    const run = runPipeline(registry, hormuzInput(patch));
    assert.equal(run.result.api_plan.gate.L2, true, JSON.stringify(patch));
    assert.equal(run.result.api_plan.l3, "OFF");
  }
});

test("API contract resolver reads the registry operation", () => {
  const contract = resolveContract(registry, "GetChokepointStatus");
  assert.equal(contract.canonical_route, "/api/supply-chain/v1/get-chokepoint-status");
  assert.equal(contract.http_method, "GET");
  assert.equal(contract.auth, "API_KEY");
  assert.ok(contract.entitlement);
  assert.equal(contract.lifecycle, "ACTIVE");
  assert.equal(contract.scope_class, "ANALYTICAL");
  assert.ok(contract.pagination);
  assert.equal(contract.error_semantics, "STANDARD_HTTP");
});

test("lifecycle gate drops an inactive operation", () => {
  const apis = registry.apis.map((api) =>
    api.operation_id === "GetChokepointStatus" ? { ...api, lifecycle_ref: "DEPRECATED" } : api,
  );
  const copy = {
    ...registry,
    apis,
    byId: { ...registry.byId, api: new Map(apis.map((api) => [api.operation_id, api])) },
  };
  const run = runPipeline(copy, hormuzInput({ explicit_methodologies: ["M16"], explicit_profiles: ["P01"] }));
  const row = run.result.api_plan.operations.find((operation) => operation.operation_id === "GetChokepointStatus");
  assert.equal(row.included, false);
  assert.equal(row.block_reason, "LIFECYCLE_GATE");
});

test("entitlement classification and call safety", () => {
  const read = registry.byId.api.get("GetEnergyPrices");
  const write = registry.byId.api.get("CreateMonitoredCompany");
  const webhook = registry.byId.api.get("RegisterWebhook");
  assert.equal(classifyCall(read).call_class, "SAFE_READ");
  assert.equal(classifyCall(write).call_class, "WRITE_SIDE_EFFECT");
  assert.equal(classifyCall(webhook).call_class, "EXTERNAL_NOTIFICATION");
  assert.equal(classifyEntitlement(read, "rest", "standard").status, "ENTITLED");
  assert.equal(classifyEntitlement(read, "mcp", "standard").status, classifyEntitlement(read, "mcp", "standard").status);
  const thin = registry.apis.find((api) => (api.entitlement?.mcp ?? []).length === 0);
  assert.equal(classifyEntitlement(thin, "mcp", "standard").status, "BLOCKED_ENTITLEMENT");
});

test("error semantics do not treat HTTP 200 as acceptance", () => {
  const contract = resolveContract(registry, "GetEnergyPrices");
  const blocked = evaluateA24(contract, null);
  assert.equal(blocked.status, "BLOCKED");
  const failed = evaluateA24(contract, { status: 200, body: { error: "upstream" }, required_fields: [], schema_valid: true, freshness_required: false });
  assert.equal(failed.status, "FAILED");
  const accepted = evaluateA24(contract, {
    status: 200,
    body: { items: [1], fetchedAt: "2026-03-01T12:00:00Z" },
    required_fields: ["items"],
    schema_valid: true,
  });
  assert.equal(accepted.status, "ACCEPTED");
  const partial = evaluateA24(contract, {
    status: 200,
    body: { items: [] },
    required_fields: ["items"],
    schema_valid: true,
    freshness_required: true,
  });
  assert.equal(partial.status, "PARTIAL");
});

test("delivery classification keeps seeded distinct from live", () => {
  const run = runPipeline(registry, hormuzInput());
  const seeded = registry.apis.find((api) => api.primary_delivery_mode === "SEEDED");
  assert.ok(seeded);
  const delivery = resolveDelivery(registry, seeded.operation_id);
  assert.equal(delivery.primary_delivery_mode, "SEEDED");
  assert.equal(delivery.seeded, true);
  assert.equal(delivery.live_observation, false);
  assert.equal(seeded.a11_delivery_bound_state, "VERIFIED");
  assert.ok(run.result.delivery.every((row) => row.retrieved_at === null));
  assert.ok(run.result.delivery.every((row) => row.called_at === null));
  assert.ok(run.result.delivery.every((row) => row.live_observation === false));
  assert.ok(run.result.delivery.every((row) => "primary_delivery_mode" in row && "cache_semantics" in row));
});

test("source unknown is preserved and same publisher counts once", () => {
  const lines = lineage([
    { source_id: "A", original_publisher: "Pub", observer: null, provider: "P", host: "h", transport: "API", collector: null, observed_at: null },
    { source_id: "B", original_publisher: "Pub", observer: null, provider: "P", host: "h2", transport: "RSS", collector: null, observed_at: "2026-03-01T10:00:00Z" },
    { source_id: "C", original_publisher: null, observer: null, provider: null, host: null, transport: null, collector: null, observed_at: null },
  ]);
  assert.equal(lines.independent_evidence_count, 2);
  assert.equal(lines.groups[0].transports.length, 2);
  assert.equal(lines.records[2].host, null);
  assert.equal(lines.records[2].original_publisher, null);
});

test("PIT null semantics and no lookahead", () => {
  const pit = applyPit(
    { event_time: "2026-03-01T08:00:00Z", original_publish_time: "2026-03-01T09:00:00Z", outcome_time: "2026-03-02T00:00:00Z" },
    "2026-03-01T12:00:00Z",
  );
  assert.equal(pit.timestamps.wm_first_seen_time, null);
  assert.equal(pit.timestamps.original_publish_time, "2026-03-01T09:00:00Z");
  assert.notEqual(pit.timestamps.wm_first_seen_time, pit.timestamps.original_publish_time);
  assert.equal(pit.timestamps.outcome_time, null);
  assert.equal(pit.excluded[0].reason, "NO_LOOKAHEAD");
  assert.equal(pit.timestamps.market_first_reaction_time, null);
});

test("research artifact validates and output router covers the required kinds", () => {
  const run = runPipeline(registry, hormuzInput(), {
    artifact_id: hormuz.artifact_id,
    created_at: hormuz.as_of,
  });
  assert.equal(run.validation.ok, true, run.validation.errors.join("\n"));
  assert.equal(run.artifact.promotion_status, "DRAFT");
  assert.ok(run.artifact.apis.length > 0);
  assert.ok(run.artifact.evidence.some((item) => item.observation.startsWith("contract ")));
  const byType = Object.fromEntries(run.outputs.map((output) => [output.output_type, output.status]));
  assert.equal(byType.LIVE_REPORT, "READY");
  assert.equal(byType.DASHBOARD_STATE, "READY");
  assert.equal(byType.RESEARCH_ARTIFACT, "READY");
  assert.equal(byType.ALERT, "STUB");
  assert.equal(byType.KNOWLEDGE_PACKAGE, "STUB");
  assert.equal(byType.TRAINING_SAMPLE, "STUB");
});

test("external gaps stay off and are not callable", () => {
  const gaps = externalGapCatalog();
  assert.equal(gaps.length, 4);
  assert.ok(gaps.every((gap) => gap.default_enabled === false && gap.enabled === false));
  assert.throws(() => gaps[0].call(), /EXTERNAL_GAP_DEFAULT_OFF/);
});

test("Hormuz mock is deterministic", () => {
  const first = runPipeline(registry, hormuzInput(), { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
  const second = runPipeline(registry, hormuzInput(), { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.result.profiles.profile_ids, ["P10", "P01", "P02"]);
  assert.deepEqual(first.result.roles.roles, ["WORLD", "FINANCE", "COMMODITY", "ENERGY"]);
  assert.ok(first.result.catalog.catalog_ids.includes("IC_STRAIT_OF_HORMUZ"));
  const executed = first.result.methodologies.traces.filter((trace) => trace.executed).map((trace) => trace.methodology_id);
  assert.deepEqual(executed, ["M03", "M15", "M16", "M20", "M21", "C03", "C04"]);
  assert.ok(first.result.methodologies.governance.every((gate) => gate.executed === false));
  assert.equal(first.artifact.primary_profile_id, "P10");
  assert.equal("profile_id" in first.artifact, false);
  assert.equal(first.result.storage.realtime, "CONTINUE");
  assert.equal(first.result.storage.knowledge_promotion, "BLOCKED_STORAGE");
});

test("NAS absence degrades without throwing", () => {
  const policy = storagePolicy({});
  assert.equal(policy.nas_present, false);
  assert.equal(policy.realtime, "CONTINUE");
  assert.equal(policy.research_persistence, "QUEUED");
  assert.equal(policy.knowledge_promotion, "BLOCKED_STORAGE");
  assert.equal(policy.large_snapshot, "DEFERRED");
  const local = storagePolicy({ WTILS_RESEARCH_ROOT: "research" });
  assert.equal(local.research_persistence, "QUEUED");
  assert.equal(local.realtime, "CONTINUE");
  const adapter = createPersistenceAdapter("unconfigured");
  assert.equal(adapter.save({ artifact_id: "RA_X" }).state, "QUEUED");
  const dev = createPersistenceAdapter("local-dev", { root: "research" });
  assert.equal(dev.save({ artifact_id: "RA_X" }).state, "LOCAL_DEV");
  assert.equal(dev.save({ artifact_id: "RA_X" }).stored, false);
});

test("mutation endpoints are not live-called", async () => {
  let calls = 0;
  const report = await runA23(registry, {
    env: { WTILS_A23_LIVE: "1", WORLDMONITOR_BASE_URL: "http://127.0.0.1:9", WTILS_API_KEY: "present" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 401 };
    },
  });
  const writes = report.results.filter((row) => row.call_class === "WRITE_SIDE_EFFECT" || row.call_class === "EXTERNAL_NOTIFICATION");
  assert.ok(writes.length > 0);
  assert.ok(writes.every((row) => row.status === "NOT_SAFE_TO_CALL" && row.called === false));
  assert.equal(report.counts.LIVE_VERIFIED, 0);
  assert.equal(report.total, 237);
  const sum = Object.values(report.counts).reduce((total, count) => total + count, 0);
  assert.equal(sum, 237);
  assert.equal(calls > 0, true);
});

test("default A23 run does not forge live access", async () => {
  let calls = 0;
  const report = await runA23(registry, {
    env: {},
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200 };
    },
  });
  assert.equal(calls, 0);
  assert.equal(report.counts.LIVE_VERIFIED, 0);
  assert.equal(report.counts.NOT_SAFE_TO_CALL > 0, true);
  assert.equal(report.counts.BLOCKED_AUTH > 0, true);
  assert.equal(report.policy.forged_live, false);
});

test("Mac Studio portability and model endpoints stay unbound", () => {
  const endpoints = modelEndpoints({});
  assert.equal(endpoints.ollama_host, null);
  assert.equal(endpoints.llm_api_url, null);
  assert.equal(endpoints.pinned_path, false);
  assert.equal(repoRoot.includes("src/wtils"), false);
  const overlay = readFileSync(path.join(repoRoot, "docker/wtils/compose.overlay.yml"), "utf8");
  const policy = readFileSync(path.join(repoRoot, "deploy/wtils/redis-7.2.env"), "utf8");
  assert.match(overlay, /WTILS_RUNTIME_HOST/);
  assert.match(overlay, /WTILS_STORAGE_ROOT/);
  assert.match(overlay, /WTILS_RESEARCH_ROOT/);
  assert.match(overlay, /OLLAMA_HOST/);
  assert.match(overlay, /WORLDMONITOR_BASE_URL/);
  assert.equal(overlay.includes("redis:7-alpine"), false);
  assert.match(policy, /7\.2/);
  assert.match(policy, /sha256/);
  assert.equal(policy.includes("redis:7-alpine"), false);
  assert.equal(UI_INTEGRATION.phase2a_ui_edits, "NONE");
  assert.equal(UI_INTEGRATION.entry_points.some((entry) => entry.existing_panel_id === "chat-analyst"), true);
  assert.notEqual(AGENT_ADAPTERS.grok_bot.duty, AGENT_ADAPTERS.chatgpt_dot.duty);
  assert.notEqual(AGENT_ADAPTERS.codex.duty, AGENT_ADAPTERS.grok_bot.duty);
});
