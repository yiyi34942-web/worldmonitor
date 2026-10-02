import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CONTRACT_VERSION,
  OBSERVATION_TIMESTAMPS,
  loadRegistry,
  profileBindingParity,
  readAState,
  repoRoot,
  requestBodyContract,
  resolveContract,
  resolveDelivery,
  runPipeline,
  scanPortability,
} from "../../src/wtils/index.mjs";

const registry = loadRegistry();
const hormuz = JSON.parse(readFileSync(path.join(repoRoot, "wtils/phase2/fixtures/hormuz-disruption.json"), "utf8"));

function hormuzRun() {
  return runPipeline(registry, hormuz, { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
}

function executableIds(run) {
  return run.result.methodologies.traces.filter((trace) => trace.executed).map((trace) => trace.methodology_id);
}

test("final_contract_2_1_2_baseline", () => {
  assert.equal(registry.contractVersion, CONTRACT_VERSION);
  assert.equal(CONTRACT_VERSION, "2.1.2");
  assert.equal(registry.roles.length, 5);
  assert.equal(registry.profiles.length, 10);
  assert.equal(registry.methods.length, 31);
  assert.equal(registry.apis.length, 237);
  assert.equal(registry.bindings.role_methodology_bindings.length, 100);
  const parity = profileBindingParity(registry);
  assert.equal(parity.consistent, true);
  assert.equal(parity.profile_relations, 85);
  assert.equal(parity.profile_bindings, 85);
  assert.equal(registry.methods.every((method) => method.version === "1.2.0"), true);
  assert.equal(registry.methods.every((method) => method.source_policy && method.source_binding_mode), true);
  const bodies = registry.apis.map((api) => requestBodyContract(api).applicability);
  assert.equal(bodies.filter((item) => item === "BOUND").length, 18);
  assert.equal(bodies.filter((item) => item === "NOT_APPLICABLE").length, 219);
  assert.equal(OBSERVATION_TIMESTAMPS.length, 13);
});

test("profile_router_matches_binding_graph", () => {
  const derived = [];
  for (const row of registry.bindings.profile_methodology_bindings) {
    if (!hormuz.explicit_profiles.includes(row.profile_id)) continue;
    if (row.binding_type !== "AUDIT") continue;
    const method = registry.byId.methodology.get(row.methodology_id);
    if (method?.execution_class === "GOVERNANCE" && !derived.includes(row.methodology_id)) derived.push(row.methodology_id);
  }
  const run = hormuzRun();
  assert.deepEqual(run.result.methodologies.registry_plan.selected, hormuz.explicit_methodologies);
  assert.deepEqual(
    run.result.methodologies.governance.map((gate) => gate.methodology_id),
    derived,
  );
  for (const methodologyId of ["M03", "M15", "M16", "M20", "M21", "C03", "C04"]) {
    assert.equal(executableIds(run).includes(methodologyId), true, methodologyId);
  }
  assert.deepEqual(derived, ["C06", "C07"]);
});

test("trigger_router_reads_registry_triggers", () => {
  const run = runPipeline(registry, {
    explicit_profiles: ["P10"],
    explicit_methodologies: [],
    triggers: ["country_instability_risk"],
    text: "country risk",
    as_of: hormuz.as_of,
    kind: "signal",
  });
  const ids = executableIds(run);
  assert.equal(ids.includes("M21"), true);
  assert.equal(ids.includes("M03"), true);
  assert.equal(ids.includes("M10"), false);
  assert.equal(ids.includes("M09"), false);
  assert.equal(ids.includes("M06"), false);
  const source = readdirSync(path.join(repoRoot, "src/wtils"))
    .map((name) => readFileSync(path.join(repoRoot, "src/wtils", name), "utf8"))
    .join("\n");
  for (const needle of [
    "yield_curve_inversion",
    "cot_extreme_positioning",
    "military_deployment",
    "humanitarian_crisis",
    "geopolitical_overlay",
    "macro_overlay",
  ]) {
    assert.equal(source.includes(needle), false, needle);
  }
});

test("execution_class_gate_final", () => {
  const run = runPipeline(registry, {
    explicit_profiles: ["P10"],
    explicit_methodologies: ["M06", "M07", "C01", "C02", "C05", "C06", "M16"],
    triggers: [],
    text: "gate",
    as_of: hormuz.as_of,
  });
  for (const methodologyId of ["M06", "M07", "C01", "C02", "C05", "C06"]) {
    assert.equal(run.result.api_plan.operations.some((row) => row.methodology_id === methodologyId), false, methodologyId);
  }
  const c06 = run.result.methodologies.traces.find((trace) => trace.methodology_id === "C06");
  assert.equal(c06.trace_state, "GOVERNANCE_TRACE");
  assert.equal(c06.executed, false);
});

test("method_version_1_2_0_from_registry", () => {
  const run = hormuzRun();
  for (const item of run.artifact.methodologies) {
    const method = registry.byId.methodology.get(item.id);
    assert.equal(item.version, "1.2.0");
    assert.equal(item.version, method.version);
    assert.equal(item.methodology_version_hash, method.methodology_version_hash);
    assert.notEqual(item.version, "1.1.0");
  }
});

test("M21_final_semantics", () => {
  const run = hormuzRun();
  const plan = run.result.api_plan.operations.filter((row) => row.methodology_id === "M21");
  const included = plan.filter((row) => row.included).map((row) => row.operation_id).sort();
  assert.deepEqual(included, ["GetCountryRisk", "GetRiskScores", "ListCrossSourceSignals"]);
  const text = JSON.stringify(plan).toLowerCase();
  for (const needle of ["imo", "carbon", "scrubber", "vessel_data", "fleet compliance", "shipping emissions"]) {
    assert.equal(text.includes(needle), false, needle);
  }
});

test("a_state_is_authority", () => {
  const blocked = registry.apis.find((api) => api.a09_source_bound_state === "BLOCKED_STATIC_EVIDENCE");
  const verified = registry.apis.find((api) => api.a09_source_bound_state === "VERIFIED");
  const blockedState = readAState(blocked, "a09_source_bound");
  const verifiedState = readAState(verified, "a09_source_bound");
  assert.equal(blockedState.base, false);
  assert.equal(blockedState.state, "BLOCKED_STATIC_EVIDENCE");
  assert.equal(blockedState.authority, "state");
  assert.equal(verifiedState.base, true);
  assert.equal(verifiedState.state, "VERIFIED");
  const contract = resolveContract(registry, blocked.operation_id);
  assert.equal(contract.source_state, "BLOCKED_STATIC_EVIDENCE");
  assert.equal(contract.status, "RESOLVED");
});

test("delivery_two_axis_final", () => {
  const verified = registry.apis.find((api) => api.a11_delivery_bound_state === "VERIFIED" && api.a12_seed_cache_bound_state === "VERIFIED");
  const blocked = registry.apis.find((api) => api.a11_delivery_bound_state === "BLOCKED_STATIC_EVIDENCE");
  const verifiedDelivery = resolveDelivery(registry, verified.operation_id);
  const blockedDelivery = resolveDelivery(registry, blocked.operation_id);
  assert.equal(verifiedDelivery.delivery_binding_state, "VERIFIED");
  assert.equal(typeof verifiedDelivery.primary_delivery_mode, "string");
  assert.equal(verifiedDelivery.cache_binding_state, "VERIFIED");
  assert.equal(typeof verifiedDelivery.cache_semantics, "string");
  assert.equal(blockedDelivery.delivery_binding_state, "BLOCKED_STATIC_EVIDENCE");
  assert.equal(blockedDelivery.primary_delivery_mode, null);
  const run = hormuzRun();
  for (const api of run.artifact.apis) {
    assert.equal(["VERIFIED", "NOT_APPLICABLE", "BLOCKED_STATIC_EVIDENCE"].includes(api.delivery_binding_state), true);
    assert.equal(["VERIFIED", "NOT_APPLICABLE", "BLOCKED_STATIC_EVIDENCE"].includes(api.cache_binding_state), true);
    if (api.delivery_binding_state === "VERIFIED") assert.equal(api.primary_delivery_mode == null, false);
    if (api.cache_binding_state === "VERIFIED") assert.equal(api.cache_semantics == null, false);
  }
});

test("request_body_contract_final", () => {
  const post = registry.apis.find((api) => api.http_method === "POST");
  const postContract = resolveContract(registry, post.operation_id);
  assert.equal(postContract.request_body_applicability, "BOUND");
  assert.equal(postContract.request_body_schema_ref.includes(post.operation_id), true);
  assert.equal(registry.apis.every((api) => api.request_contract_ref), true);
  const run = hormuzRun();
  assert.equal(run.artifact.apis.every((api) => api.request_contract_ref && api.request_body_schema_ref), true);
});

test("source_policy_inherit_and_unknown", () => {
  const method = registry.byId.methodology.get("M16");
  assert.equal(method.source_binding_mode, "INHERIT_FROM_API_BINDINGS");
  assert.deepEqual(method.source_requirements, []);
  const none = registry.byId.methodology.get("C05");
  assert.equal(none.source_binding_mode, "NONE");
  const run = hormuzRun();
  assert.ok(run.artifact.sources.some((source) => source.publisher && source.verification_state !== "UNKNOWN"));
  const unknown = run.artifact.sources.find((source) => source.verification_state === "UNKNOWN");
  assert.ok(unknown);
  assert.equal(unknown.publisher, null);
  assert.equal(unknown.provider, null);
  assert.equal(unknown.host, null);
  assert.equal(unknown.transport, null);
});

test("hormuz_artifact_schema_errors_zero", () => {
  const run = hormuzRun();
  assert.equal(run.artifact.pit && Object.keys(run.artifact.pit).length, 13);
  const proc = spawnSync("python3", ["scripts/wtils/check-artifact-schema.py"], {
    cwd: repoRoot,
    input: JSON.stringify(run.artifact),
    encoding: "utf8",
  });
  assert.equal(proc.status, 0, `${proc.stdout}\n${proc.stderr}`);
  const report = JSON.parse(proc.stdout);
  assert.equal(report.error_count, 0);
});

test("final_portability_and_external_gap", () => {
  const scan = scanPortability(repoRoot);
  assert.deepEqual(scan.findings, []);
  const run = hormuzRun();
  assert.equal(run.result.api_plan.external_gaps.every((gap) => gap.enabled === false && gap.default_enabled === false), true);
  assert.equal(run.result.storage.realtime, "CONTINUE");
  assert.equal(run.result.storage.research_persistence, "QUEUED");
  assert.equal(run.result.storage.knowledge_promotion, "BLOCKED_STORAGE");
  assert.equal(run.result.storage.large_snapshot, "DEFERRED");
});
