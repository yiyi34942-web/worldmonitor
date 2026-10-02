import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ARTIFACT_FIELDS,
  CONTRACT_VERSION,
  OBSERVATION_TIMESTAMPS,
  appendRevision,
  createPersistenceAdapter,
  loadRegistry,
  methodSemanticView,
  planApis,
  repoRoot,
  resolveContract,
  resolveDelivery,
  resolveSources,
  routeMethodologies,
  routeProfiles,
  runA23,
  runA24,
  runPipeline,
  scanPortability,
  storagePolicy,
} from "../../src/wtils/index.mjs";

const registry = loadRegistry();
const hormuz = JSON.parse(
  readFileSync(path.join(repoRoot, "wtils/phase2/fixtures/hormuz-disruption.json"), "utf8"),
);

function hormuzRun() {
  return runPipeline(registry, hormuz, { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
}

const EXPECTED_METHODS = {
  M01: ["China Activity Nowcast", "DIRECT_API"],
  M02: ["News Digest & Briefing", "DIRECT_API"],
  M04: ["Country Resilience Index", "DIRECT_API"],
  M05: ["Resilience Indicators", "DIRECT_API"],
  M06: ["Resilience Indicator Licensing", "NONCALLABLE"],
  M07: ["Known Limitations", "NONCALLABLE"],
  M09: ["SWF Classification Rubric", "COMPOSITE"],
  M10: ["Five-Factor Country Scorecard", "DIRECT_API"],
  M11: ["Demographics & Workforce Capability", "DIRECT_API"],
  M13: ["Defense Industrial Base", "DIRECT_API"],
  M14: ["Mineral Production & Processing Concentration", "DIRECT_API"],
  M15: ["Commodity / Supply Vulnerability", "DIRECT_API"],
  M16: ["Chokepoints", "DIRECT_API"],
  M21: ["CII Risk Scoring", "DIRECT_API"],
  M22: ["Disease Outbreak Alert Level", "DIRECT_API"],
  C01: ["CII Operator Overview", "NONCALLABLE"],
  C02: ["Revision & Corrections", "NONCALLABLE"],
  C05: ["Algorithms & Scoring", "META"],
  C06: ["Decision-Signal Provenance", "GOVERNANCE"],
  C07: ["Source Attribution", "GOVERNANCE"],
};

test("runtime_loads_contract_2_1", () => {
  assert.equal(registry.contractVersion, CONTRACT_VERSION);
  assert.equal(registry.roles.length, 5);
  assert.equal(registry.methods.length, 31);
  assert.equal(registry.apis.length, 237);
  assert.equal(ARTIFACT_FIELDS.length, 26);
  assert.equal(OBSERVATION_TIMESTAMPS.length, 13);
  assert.equal(registry.apis.every((api) => typeof api.request_contract_ref === "string" && api.request_contract_ref.length > 0), true);
  const report = JSON.parse(
    readFileSync(path.join(repoRoot, "wtils/phase2/contract-reconciliation/PATCH_RECONCILIATION_REPORT.json"), "utf8"),
  );
  assert.equal(report.accepted, 286);
  const missing = report.patches.filter((patch) => {
    if (patch.decision !== "ACCEPTED") return false;
    return patch.runtime_evidence_present !== true
      && patch.contract_reason_evidence_present !== true
      && patch.static_code_evidence_present !== true
      && patch.evidence_type !== "static_code_evidence";
  });
  assert.equal(missing.length, 0);
});

test("no_legacy_contract_fields", () => {
  const run = hormuzRun();
  const blob = JSON.stringify({ artifact: run.artifact, traces: run.result.methodologies, contracts: run.result.contracts });
  assert.equal(blob.includes("legacy_classification"), false);
  assert.equal(blob.includes("request_schema_ref"), false);
  assert.equal(blob.includes("_state_state"), false);
  assert.equal("profile_id" in run.artifact, false);
  assert.equal(run.result.methodologies.traces.some((trace) => "classification" in trace), false);
});

test("runtime_uses_request_contract_ref", () => {
  const contract = resolveContract(registry, "GetChokepointStatus");
  assert.equal(contract.request_contract_ref.includes("GetChokepointStatus"), true);
  assert.equal("request_schema" in contract, false);
  assert.equal(contract.request_body_schema_ref, null);
  const post = registry.apis.find((api) => api.http_method === "POST");
  const postContract = resolveContract(registry, post.operation_id);
  assert.equal("request_body_schema_ref" in postContract, true);
  assert.equal(postContract.status, "RESOLVED");
});

test("runtime_uses_delivery_two_axis", () => {
  const cached = registry.apis.find((api) => api.primary_delivery_mode === "REQUEST" && api.cache_semantics === "CACHED_FETCH");
  const unbound = registry.apis.find((api) => api.primary_delivery_mode == null && api.delivery_semantics_ref === "SEEDED");
  const cachedDelivery = resolveDelivery(registry, cached.operation_id);
  const unboundDelivery = resolveDelivery(registry, unbound.operation_id);
  assert.equal(cachedDelivery.primary_delivery_mode, "REQUEST");
  assert.equal(cachedDelivery.cache_semantics, "CACHED_FETCH");
  assert.equal(cachedDelivery.live_observation, false);
  assert.equal(unboundDelivery.primary_delivery_mode, null);
  assert.equal(unboundDelivery.seeded, false);
  assert.equal(unboundDelivery.live_observation, false);
  assert.equal("delivery_mode" in cachedDelivery, false);
});

test("runtime_reads_correct_method_semantics", () => {
  for (const [id, [name, execution]] of Object.entries(EXPECTED_METHODS)) {
    const view = methodSemanticView(registry.byId.methodology.get(id));
    assert.equal(view.canonical_name, name, id);
    assert.equal(view.execution_class, execution, id);
    assert.equal(view.payload_authority, "NOT_USED_FOR_ROUTING");
  }
  const run = hormuzRun();
  const m16 = run.result.api_plan.operations.filter((row) => row.methodology_id === "M16" && row.included).map((row) => row.operation_id);
  for (const operationId of ["GetChokepointStatus", "GetChokepointHistory", "GetCountryChokepointIndex", "GetChokepointDependencies"]) {
    assert.equal(m16.includes(operationId), true, operationId);
  }
  const c03 = run.result.api_plan.included.filter((row) => row.methodology_id === "C03").map((row) => row.operation_id);
  for (const operationId of ["ListUnrestEvents", "ListMilitaryFlights", "GetVesselSnapshot", "ListEarthquakes"]) {
    assert.equal(c03.includes(operationId), true, operationId);
  }
  const c04 = run.result.api_plan.operations.filter((row) => row.methodology_id === "C04");
  assert.equal(c04.some((row) => row.operation_id === "GetRiskScores" && row.included), true);
  assert.equal(c04.some((row) => row.operation_id === "ListCrossSourceSignals" && row.included === false), true);
});

test("M21_not_imo_cii", () => {
  const run = hormuzRun();
  const trace = run.result.methodologies.traces.find((row) => row.methodology_id === "M21");
  const plan = run.result.api_plan.operations.filter((row) => row.methodology_id === "M21");
  const text = `${JSON.stringify(trace)} ${JSON.stringify(plan)}`.toLowerCase();
  for (const needle of ["imo", "carbon", "scrubber", "cii_compliance", "vessel_data", "fleet_impact"]) {
    assert.equal(text.includes(needle), false, needle);
  }
  const included = plan.filter((row) => row.included).map((row) => row.operation_id).sort();
  assert.deepEqual(included, ["GetCountryRisk", "GetRiskScores", "ListCrossSourceSignals"]);
});

test("noncallable_not_executed", () => {
  const profiles = routeProfiles(registry, { explicit_profiles: ["P10"] }, { matches: [] });
  const routed = routeMethodologies(
    registry,
    { explicit_methodologies: ["M06", "M07", "C01", "C02", "M16"], triggers: [] },
    profiles,
  );
  const input = {
    explicit_methodologies: ["M06", "M07", "C01", "C02", "M16"],
    explicit_profiles: ["P10"],
    triggers: [],
    priority: "normal",
    deep: false,
  };
  const plan = planApis(registry, input, routed);
  for (const id of ["M06", "M07", "C01", "C02"]) {
    const trace = routed.traces.find((row) => row.methodology_id === id);
    assert.equal(trace.executed, false, id);
    assert.equal(trace.trace_state, "NOT_EXECUTED", id);
    assert.equal(plan.operations.some((row) => row.methodology_id === id), false, id);
  }
});

test("meta_not_executed", () => {
  const profiles = routeProfiles(registry, { explicit_profiles: ["P01"] }, { matches: [] });
  const routed = routeMethodologies(
    registry,
    { explicit_methodologies: ["C05", "M16"], triggers: [] },
    profiles,
  );
  const c05 = routed.traces.find((row) => row.methodology_id === "C05");
  assert.equal(c05.execution_class, "META");
  assert.equal(c05.executed, false);
  const plan = planApis(registry, { explicit_methodologies: ["C05"], priority: "normal", deep: false, triggers: [] }, routed);
  assert.equal(plan.operations.some((row) => row.methodology_id === "C05"), false);
});

test("governance_trace_present", () => {
  const run = hormuzRun();
  for (const id of ["C06", "C07"]) {
    const item = run.artifact.methodologies.find((row) => row.id === id);
    assert.equal(item.execution_class, "GOVERNANCE");
    assert.equal(item.trace_state, "GOVERNANCE_TRACE");
    assert.equal(run.result.api_plan.operations.some((row) => row.methodology_id === id), false);
  }
  assert.equal(run.result.methodologies.governance.every((gate) => gate.executed === false), true);
});

test("research_artifact_full_26_field_contract", () => {
  const run = hormuzRun();
  assert.deepEqual(Object.keys(run.artifact).sort(), [...ARTIFACT_FIELDS].sort());
  assert.equal(run.artifact.artifact_version, "2.1.0");
  const structural = run.validation.errors.filter(
    (error) => !error.includes("primary_delivery_mode") && !error.includes("cache_semantics"),
  );
  assert.deepEqual(structural, []);
  assert.ok(run.artifact.apis.length > 0);
  assert.ok(run.artifact.apis.every((api) => api.called_at === null && api.live_observation === false));
});

test("research_artifact_multi_profile", () => {
  const run = hormuzRun();
  assert.equal(run.artifact.primary_profile_id, "P10");
  assert.deepEqual(run.artifact.profile_ids, ["P10", "P01", "P02"]);
  assert.equal(run.artifact.profile_ids.includes(run.artifact.primary_profile_id), true);
  assert.equal(new Set(run.artifact.profile_ids).size, run.artifact.profile_ids.length);
});

test("artifact_method_two_axis", () => {
  const run = hormuzRun();
  for (const item of run.artifact.methodologies) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.version, "string");
    assert.equal(typeof item.provenance_class, "string");
    assert.equal(typeof item.execution_class, "string");
    assert.equal(typeof item.methodology_version_hash, "string");
    assert.equal(typeof item.trace_state, "string");
    assert.equal("legacy_classification" in item, false);
  }
});

test("artifact_source_unknown_preserved", () => {
  const unknown = resolveSources(registry, ["SRC_NOT_IN_REGISTRY"], null);
  assert.equal(unknown.records[0].original_publisher, null);
  assert.equal(unknown.records[0].host, null);
  assert.equal(unknown.records[0].state, "UNKNOWN");
  assert.equal(unknown.independent_evidence_count, 1);
  const run = hormuzRun();
  for (const source of run.artifact.sources) {
    assert.equal(typeof source.verification_state, "string");
    for (const key of ["publisher", "provider", "host", "transport"]) {
      assert.equal(source[key] === "UNKNOWN", false);
    }
  }
});

test("artifact_pit_13_fields", () => {
  const run = hormuzRun();
  assert.deepEqual(Object.keys(run.artifact.pit), [...OBSERVATION_TIMESTAMPS]);
  assert.equal(run.artifact.pit.event_time, "2026-03-01T08:00:00Z");
  assert.equal(run.artifact.pit.original_publish_time, "2026-03-01T09:00:00Z");
  assert.equal(run.artifact.pit.wm_first_seen_time, null);
  assert.equal(run.artifact.pit.source_observed_time, null);
  assert.notEqual(run.artifact.pit.wm_first_seen_time, run.artifact.pit.original_publish_time);
  assert.notEqual(run.artifact.pit.source_observed_time, run.artifact.as_of_time);
});

test("delta_t_null_when_time_missing", () => {
  const run = hormuzRun();
  const computed = run.artifact.delta_t.find((row) => row.from_event === "event_time" && row.to_event === "original_publish_time");
  const missing = run.artifact.delta_t.find((row) => row.from_event === "original_publish_time" && row.to_event === "wm_first_seen_time");
  assert.equal(computed.duration_ms, 3600000);
  assert.equal(computed.basis, "observed_timestamps");
  assert.equal(missing.from_time, "2026-03-01T09:00:00Z");
  assert.equal(missing.to_time, null);
  assert.equal(missing.duration_ms, null);
  assert.equal(missing.basis, "not_computable");
});

test("revision_append_only_contract", () => {
  const run = hormuzRun();
  const before = run.artifact.revision.revision_number;
  const { previous, next } = appendRevision(run.artifact, "fixture revision", hormuz.as_of);
  assert.equal(previous.revision.revision_number, before);
  assert.equal(previous.revision.previous_revision_ref, null);
  assert.equal(next.revision.revision_number, before + 1);
  assert.equal(next.revision.previous_revision_ref, `${run.artifact.artifact_id}#r${before}`);
  assert.equal(next.revision.revision_reason, "fixture revision");
  assert.equal(next.revision.revision_created_at, hormuz.as_of);
  const memory = createPersistenceAdapter("memory");
  memory.save(previous);
  memory.save(next);
  assert.equal(memory.list().length, 2);
  assert.equal(memory.list()[0].revision.revision_number, 0);
});

test("Hormuz_v2_1_deterministic", () => {
  const first = hormuzRun();
  const second = hormuzRun();
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.result.roles.roles, ["WORLD", "FINANCE", "COMMODITY", "ENERGY"]);
  assert.equal(first.result.roles.roles.includes("TECH"), false);
  const executed = first.artifact.methodologies.filter((row) => row.trace_state === "EXECUTED").map((row) => row.id);
  assert.deepEqual(executed, ["M03", "M15", "M16", "M20", "M21", "C03", "C04"]);
  const ready = Object.fromEntries(first.outputs.map((output) => [output.output_type, output.status]));
  assert.equal(ready.LIVE_REPORT, "READY");
  assert.equal(ready.DASHBOARD_STATE, "READY");
  assert.equal(ready.RESEARCH_ARTIFACT, "READY");
  assert.equal(ready.ALERT, "STUB");
  assert.equal(first.result.api_plan.external_gaps.every((gap) => gap.enabled === false), true);
});

test("NAS_absent_degrades", () => {
  const policy = storagePolicy({ NAS_PRESENT: "false", WTILS_RESEARCH_ROOT: "research" });
  assert.equal(policy.realtime, "CONTINUE");
  assert.equal(policy.research_persistence, "QUEUED");
  assert.equal(policy.knowledge_promotion, "BLOCKED_STORAGE");
  assert.equal(policy.large_snapshot, "DEFERRED");
  const run = hormuzRun();
  assert.equal(run.persistence.state, "MEMORY");
  assert.equal(run.result.storage.knowledge_promotion, "BLOCKED_STORAGE");
  const source = readdirSync(path.join(repoRoot, "src/wtils")).map((name) => readFileSync(path.join(repoRoot, "src/wtils", name), "utf8")).join("\n");
  assert.equal(/postgres|sqlite|duckdb/i.test(source), false);
});

test("Air_runtime_untouched", () => {
  const beforeNames = readFileSync("/tmp/wtils-p2av-docker-names-before.txt", "utf8").trim().split("\n").sort();
  const beforeVolumes = readFileSync("/tmp/wtils-p2av-docker-vols-before.txt", "utf8").trim().split("\n").sort();
  const beforePorts = readFileSync("/tmp/wtils-p2av-docker-ports-before.txt", "utf8").trim();
  const afterNames = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").sort();
  const afterVolumes = execFileSync("docker", ["volume", "ls", "--format", "{{.Name}}"], { encoding: "utf8" }).trim().split("\n").sort();
  const afterPorts = execFileSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"], { encoding: "utf8" }).trim().split("\n").sort().join("\n");
  assert.deepEqual(afterNames, beforeNames);
  assert.deepEqual(afterVolumes, beforeVolumes);
  assert.equal(afterPorts, beforePorts.split("\n").sort().join("\n"));
});

test("Mac_Studio_portability", () => {
  const scan = scanPortability(repoRoot);
  assert.equal(scan.findings.length, 0, scan.findings.join("\n"));
  assert.ok(scan.files_scanned > 0);
});
