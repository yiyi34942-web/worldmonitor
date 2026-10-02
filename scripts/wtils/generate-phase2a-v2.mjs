import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ARTIFACT_FIELDS,
  CONTRACT_VERSION,
  FIVE_ROLES,
  OBSERVATION_TIMESTAMPS,
  appendRevision,
  externalGapCatalog,
  levelGate,
  loadRegistry,
  profileBindingParity,
  readAState,
  registryMethodPlan,
  repoRoot,
  requestBodyContract,
  resolveContract,
  resolveInput,
  routeRoles,
  runA23,
  runA24,
  runPipeline,
  scanPortability,
  storagePolicy,
} from "../../src/wtils/index.mjs";

const STATIC_BASELINE = "f8d3eb60361db203f33c33e9514abda90dc94b59";
const keyNames = ["WTILS_API_KEY", "WORLDMONITOR_API_KEY", "WM_API_KEY", "API_KEY", "WORLD_MONITOR_API_KEY"];
const outDir = path.join(repoRoot, "wtils", "phase2", "runtime-v2-final");
const beforeDir = "/tmp";
const beforeNamesFile = path.join(beforeDir, "wtils-p2av2-docker-names-before.txt");
const beforeVolumesFile = path.join(beforeDir, "wtils-p2av2-docker-vols-before.txt");
const beforePortsFile = path.join(beforeDir, "wtils-p2av2-docker-ports-before.txt");

mkdirSync(outDir, { recursive: true });

function writeText(name, text) {
  writeFileSync(path.join(outDir, name), text.endsWith("\n") ? text : `${text}\n`);
}

function writeJson(name, value) {
  writeText(name, `${JSON.stringify(value, null, 2)}\n`);
}

const presentKeys = keyNames.filter((name) => Boolean(process.env[name]));
if (presentKeys.length > 0) {
  writeText(
    "FINAL_CONTRACT_CONFLICT_REPORT.md",
    [
      "# FINAL_CONTRACT_CONFLICT_REPORT",
      "",
      "STOP_AND_REPORT_CREDENTIAL_AVAILABLE",
      "",
      "An operator API key name is set. The value was not read and was not used.",
      "",
      ...presentKeys.map((name) => `- ${name}`),
      "",
      "PRE_HARDWARE_READY = NO",
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ stop: "STOP_AND_REPORT_CREDENTIAL_AVAILABLE", names: presentKeys }));
  process.exit(2);
}

function runJson(command, args, input = null) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message) : null,
  };
}

function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

const validatorRun = runJson("python3", ["wtils/scripts/registries/validate.py"]);
const validator = parseJson(validatorRun.stdout) ?? {
  valid: false,
  error_count: null,
  warning_count: null,
};
if (validatorRun.status !== 0 || validator.valid !== true || validator.error_count !== 0) {
  writeText(
    "FINAL_CONTRACT_CONFLICT_REPORT.md",
    [
      "# FINAL_CONTRACT_CONFLICT_REPORT",
      "",
      "Registry validator did not pass. Runtime was not started.",
      "",
      `- exit: ${validatorRun.status}`,
      `- valid: ${validator.valid}`,
      `- error_count: ${validator.error_count}`,
      "",
      "PRE_HARDWARE_READY = NO",
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ stop: "VALIDATOR_FAIL", exit: validatorRun.status, error_count: validator.error_count }));
  process.exit(1);
}

const registryTestRun = runJson("python3", ["wtils/tests/registries/test_registries.py"]);
const registryTests = parseJson(registryTestRun.stdout) ?? { passed: 0, failed: null, results: [] };
const negativeProof = (registryTests.results ?? []).find((item) => item.test === "negative_validator_proof_12_mutations");
const negativeProofOk = negativeProof?.status === "PASS" && String(negativeProof.detail ?? "").startsWith("12/12");
if (registryTestRun.status !== 0 || registryTests.failed !== 0 || !negativeProofOk) {
  writeText(
    "FINAL_CONTRACT_CONFLICT_REPORT.md",
    [
      "# FINAL_CONTRACT_CONFLICT_REPORT",
      "",
      "STOP_AND_REPORT_BASELINE_MISMATCH",
      "",
      "Registry tests did not pass. Runtime was not started.",
      "",
      `- exit: ${registryTestRun.status}`,
      `- passed: ${registryTests.passed}`,
      `- failed: ${registryTests.failed}`,
      `- negative_validator_proof_12_mutations: ${negativeProof ? `${negativeProof.status} ${negativeProof.detail}` : "MISSING"}`,
      "",
      "PRE_HARDWARE_READY = NO",
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({
    stop: "STOP_AND_REPORT_BASELINE_MISMATCH",
    registry_tests: { passed: registryTests.passed, failed: registryTests.failed, negative: negativeProof?.detail ?? null },
  }));
  process.exit(1);
}

const registry = loadRegistry();
const hormuz = JSON.parse(readFileSync(path.join(repoRoot, "wtils/phase2/fixtures/hormuz-disruption.json"), "utf8"));
const pipeline = runPipeline(registry, hormuz, { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
const second = runPipeline(registry, hormuz, { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
const schemaRun = runJson("python3", ["scripts/wtils/check-artifact-schema.py"], JSON.stringify(pipeline.artifact));
const schema = parseJson(schemaRun.stdout) ?? { error_count: null, errors: [] };
const a23 = await runA23(registry, { env: {} });
const a24 = runA24(registry);
const parity = profileBindingParity(registry);
const expectedPlan = registryMethodPlan(
  registry,
  hormuz.explicit_profiles,
  hormuz.triggers,
  hormuz.explicit_methodologies,
);
const actualSelected = pipeline.result.methodologies.registry_plan.selected;
const actualGovernance = pipeline.result.methodologies.governance.map((gate) => gate.methodology_id);
const resolved = resolveInput(hormuz);
const gate = levelGate(resolved);
const levelByClass = { O: "L0", R: "L1", E: "L2" };
const executedIds = new Set(
  pipeline.result.methodologies.traces.filter((trace) => trace.executed).map((trace) => trace.methodology_id),
);
const expectedIncluded = [];
for (const binding of registry.bindings.methodology_api_bindings ?? []) {
  if (!executedIds.has(binding.methodology_id)) continue;
  const level = levelByClass[binding.classification];
  const api = registry.byId.api.get(binding.operation_id);
  if (!api || !level) continue;
  if (api.lifecycle_ref === "ACTIVE" && gate[level] === true) {
    expectedIncluded.push(`${binding.methodology_id}:${binding.classification}:${binding.operation_id}`);
  }
}
const actualIncluded = pipeline.result.api_plan.included.map(
  (row) => `${row.methodology_id}:${row.classification}:${row.operation_id}`,
);
const sameSet = (left, right) => {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
};

function planRows(methodologyId) {
  return pipeline.result.api_plan.operations
    .filter((row) => row.methodology_id === methodologyId)
    .map((row) => `${row.level} ${row.classification} ${row.operation_id} included=${row.included}`);
}

const bodies = registry.apis.map((api) => requestBodyContract(api));
const bodyBound = bodies.filter((item) => item.applicability === "BOUND").length;
const bodyNotApplicable = bodies.filter((item) => item.applicability === "NOT_APPLICABLE").length;
const bodyOther = bodies.length - bodyBound - bodyNotApplicable;
const requestRefs = registry.apis.filter((api) => typeof api.request_contract_ref === "string" && api.request_contract_ref.length > 0).length;
const versionsOk = pipeline.artifact.methodologies.every((item) => {
  const method = registry.byId.methodology.get(item.id);
  return item.version === "1.2.0" && item.version === method?.version && item.methodology_version_hash === method?.methodology_version_hash;
});
const forbiddenM21 = ["imo", "carbon", "scrubber", "vessel_data", "fleet compliance", "shipping emissions"];
const m21Plan = pipeline.result.api_plan.operations.filter((row) => row.methodology_id === "M21");
const m21Text = JSON.stringify(m21Plan).toLowerCase();
const m21Hits = forbiddenM21.filter((needle) => m21Text.includes(needle));
const m21Included = m21Plan.filter((row) => row.included).map((row) => row.operation_id).sort();
const m16Included = pipeline.result.api_plan.included
  .filter((row) => row.methodology_id === "M16")
  .map((row) => row.operation_id);
const chokepointOps = ["GetChokepointStatus", "GetChokepointHistory", "GetCountryChokepointIndex", "GetChokepointDependencies"];
const oldTriggers = [
  "yield_curve_inversion",
  "cot_extreme_positioning",
  "military_deployment",
  "humanitarian_crisis",
  "geopolitical_overlay",
  "macro_overlay",
];
const runtimeSource = readdirSync(path.join(repoRoot, "src/wtils"))
  .filter((name) => name.endsWith(".mjs"))
  .map((name) => readFileSync(path.join(repoRoot, "src/wtils", name), "utf8"))
  .join("\n");
const oldTriggerHits = oldTriggers.filter((needle) => runtimeSource.includes(needle));
const blockedClasses = ["NONCALLABLE", "META"];
const normalPlanLeak = pipeline.result.api_plan.operations.filter((row) => {
  const method = registry.byId.methodology.get(row.methodology_id);
  return blockedClasses.includes(method?.execution_class) || method?.execution_class === "GOVERNANCE";
});
const classOf = (id) => registry.byId.methodology.get(id)?.execution_class ?? null;
const deliveryViolations = [];
for (const api of registry.apis) {
  const delivery = readAState(api, "a11_delivery_bound");
  const cache = readAState(api, "a12_seed_cache_bound");
  if (delivery.state === "VERIFIED" && api.primary_delivery_mode == null) deliveryViolations.push(api.operation_id);
  if (cache.state === "VERIFIED" && api.cache_semantics == null) deliveryViolations.push(api.operation_id);
}
const artifactDeliveryOk = pipeline.artifact.apis.every((api) => {
  const states = ["VERIFIED", "NOT_APPLICABLE", "BLOCKED_STATIC_EVIDENCE"];
  if (!states.includes(api.delivery_binding_state) || !states.includes(api.cache_binding_state)) return false;
  if (api.delivery_binding_state === "VERIFIED" && api.primary_delivery_mode == null) return false;
  if (api.cache_binding_state === "VERIFIED" && api.cache_semantics == null) return false;
  return "primary_delivery_mode" in api && "cache_semantics" in api;
});
const aStateSampleOk = registry.apis.every((api) => {
  for (let index = 0; index <= 22; index += 1) {
    const name = `a${String(index).padStart(2, "0")}_`;
    const stateKey = Object.keys(api).find((key) => key.startsWith(name) && key.endsWith("_state") && !key.endsWith("_state_state"));
    if (!stateKey) continue;
    const baseKey = stateKey.slice(0, -"_state".length);
    const state = api[stateKey];
    const base = api[baseKey];
    if (state === "VERIFIED" && base !== true) return false;
    if ((state === "NOT_APPLICABLE" || state === "BLOCKED_STATIC_EVIDENCE") && base !== false) return false;
  }
  return true;
});
const blockedContract = registry.apis.find((api) => api.a09_source_bound_state === "BLOCKED_STATIC_EVIDENCE");
const blockedResolved = resolveContract(registry, blockedContract.operation_id);
const sourceModesOk = registry.methods.every((method) => {
  const mode = method.source_binding_mode;
  if (!method.source_policy) return false;
  if (!["EXPLICIT", "INHERIT_FROM_API_BINDINGS", "NONE"].includes(mode)) return false;
  if (mode === "NONE") return ["NONCALLABLE", "META", "GOVERNANCE"].includes(method.execution_class);
  return true;
});
const unknownSources = pipeline.artifact.sources.filter((source) => source.verification_state === "UNKNOWN");
const unknownClean = unknownSources.every(
  (source) => source.publisher == null && source.provider == null && source.host == null && source.transport == null,
);
const pitOk = OBSERVATION_TIMESTAMPS.every((field) => field in pipeline.artifact.pit)
  && pipeline.artifact.pit.event_time === hormuz.timestamps.event_time
  && pipeline.artifact.pit.original_publish_time === hormuz.timestamps.original_publish_time
  && pipeline.artifact.pit.wm_first_seen_time === null
  && pipeline.artifact.pit.source_observed_time === null;
const deltaOk = pipeline.artifact.delta_t.every((row) => {
  if (!row.from_time || !row.to_time) return row.duration_ms === null;
  return Number.isInteger(row.duration_ms);
});
const revised = appendRevision(pipeline.artifact, "final pre-hardware check", hormuz.as_of);
const revisionOk = pipeline.artifact.revision.revision_number === 0
  && pipeline.artifact.revision.previous_revision_ref === null
  && revised.previous === pipeline.artifact
  && revised.next.revision.revision_number === 1
  && revised.next.revision.previous_revision_ref === `${pipeline.artifact.artifact_id}#r0`
  && revised.next.revision.revision_reason === "final pre-hardware check"
  && revised.next.revision.revision_created_at === hormuz.as_of;
const roles = pipeline.result.roles.roles;
const rolesOk = registry.roles.length === 5
  && FIVE_ROLES.every((roleId, index) => registry.roles[index]?.role_id === roleId)
  && roles.includes("WORLD")
  && roles.includes("ENERGY")
  && roles.includes("COMMODITY")
  && roles.includes("FINANCE")
  && !roles.includes("TECH")
  && routeRoles(registry, resolved, pipeline.result.profiles).tech_default === "OFF";
const minimumMethods = ["M03", "M15", "M16", "M20", "M21", "C03", "C04"];
const profileRouterOk = parity.consistent
  && parity.profile_relations === 85
  && parity.profile_bindings === 85
  && pipeline.artifact.primary_profile_id === "P10"
  && sameSet(pipeline.artifact.profile_ids, ["P10", "P01", "P02"]);
const methodRouterOk = sameSet(expectedPlan.selected, actualSelected)
  && sameSet(expectedPlan.governance, actualGovernance)
  && minimumMethods.every((id) => executedIds.has(id))
  && sameSet(actualGovernance, ["C06", "C07"])
  && oldTriggerHits.length === 0
  && versionsOk;
const apiPlannerOk = sameSet(expectedIncluded, actualIncluded)
  && normalPlanLeak.length === 0
  && chokepointOps.every((operationId) => m16Included.includes(operationId))
  && m21Included.includes("GetRiskScores")
  && m21Included.includes("GetCountryRisk")
  && m21Included.includes("ListCrossSourceSignals");
const gaps = externalGapCatalog();
const storage = storagePolicy({});
const nasOk = storage.nas_present === false
  && storage.realtime === "CONTINUE"
  && storage.research_persistence === "QUEUED"
  && storage.knowledge_promotion === "BLOCKED_STORAGE"
  && storage.large_snapshot === "DEFERRED";
const otherA23 = a23.total - a23.counts.LIVE_VERIFIED - a23.counts.BLOCKED_AUTH - a23.counts.NOT_SAFE_TO_CALL;
const a23Ok = a23.counts.LIVE_VERIFIED === 0
  && a23.counts.BLOCKED_AUTH === 225
  && a23.counts.NOT_SAFE_TO_CALL === 12
  && otherA23 === 0
  && a23.results.every((row) => row.called === false);
const a24Ok = a24.counts.BLOCKED === 237 && a24.counts.ACCEPTED === 0 && a24.counts.FAILED === 0;

const conflicts = [];
function conflict(id, summary) {
  conflicts.push({ id, summary });
}
if (CONTRACT_VERSION !== "2.1.2" || registry.contractVersion !== "2.1.2") conflict("CONTRACT_VERSION", "Runtime contract version is not 2.1.2.");
if (!profileRouterOk) conflict("PROFILE_ROUTER", "Profile graph and Hormuz profile route disagree.");
if (!methodRouterOk) conflict("METHOD_ROUTER", "Registry method plan and runtime selection disagree.");
if (!apiPlannerOk) conflict("API_PLANNER", "API plan does not match the binding graph and level gate.");
if (m21Hits.length > 0) conflict("M21_SEMANTICS", `M21 plan contains forbidden terms: ${m21Hits.join(", ")}.`);
if (!aStateSampleOk || blockedResolved.status === "FAILED") conflict("A_STATE", "A-state base false was treated as a failure or the dual-layer invariant failed.");
if (deliveryViolations.length > 0 || !artifactDeliveryOk) conflict("DELIVERY_TWO_AXIS", "A verified delivery or cache axis is null, or the artifact omitted a binding state.");
if (requestRefs !== 237) conflict("REQUEST_CONTRACT", `request_contract_ref ${requestRefs}/237.`);
if (bodyBound !== 18 || bodyNotApplicable !== 219 || bodyOther !== 0) conflict("REQUEST_BODY", `Body contract bound ${bodyBound}, not applicable ${bodyNotApplicable}, other ${bodyOther}.`);
if (!sourceModesOk) conflict("SOURCE_POLICY", "source_binding_mode or source_policy does not match the execution class rule.");
if (!unknownClean) conflict("SOURCE_UNKNOWN", "An UNKNOWN source row contains an invented publisher, provider, host, or transport.");
if (schema.error_count !== 0 || schemaRun.status !== 0) conflict("RESEARCH_ARTIFACT_SCHEMA", `Strict schema errors ${schema.error_count}.`);
if (!pitOk) conflict("PIT", "PIT timestamps do not match the 13-field null-preserving contract.");
if (!deltaOk) conflict("DELTA_T", "delta_t computed a duration without both timestamps.");
if (!revisionOk) conflict("REVISION", "Revision is not append-only.");
if (pipeline.digest !== second.digest) conflict("HORMUZ_DETERMINISTIC", "Two Hormuz runs produced different digests.");
if (!ARTIFACT_FIELDS.every((field) => field in pipeline.artifact)) conflict("ARTIFACT_FIELDS", "Research artifact is missing a required contract field.");

function linesOf(file) {
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").trim().split("\n").filter(Boolean).sort();
}
function dockerLines(args) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
}
let air = { namesEqual: false, volumesEqual: false, portsEqual: false, beforeNames: null, afterNames: null, beforeVolumes: null, afterVolumes: null, error: null };
try {
  const beforeNames = linesOf(beforeNamesFile);
  const beforeVolumes = linesOf(beforeVolumesFile);
  const beforePorts = linesOf(beforePortsFile);
  const afterNames = dockerLines(["ps", "--format", "{{.Names}}"]);
  const afterVolumes = dockerLines(["volume", "ls", "--format", "{{.Name}}"]);
  const afterPorts = dockerLines(["ps", "--format", "{{.Names}}\t{{.Ports}}"]);
  air = {
    namesEqual: beforeNames != null && beforeNames.join("\n") === afterNames.join("\n"),
    volumesEqual: beforeVolumes != null && beforeVolumes.join("\n") === afterVolumes.join("\n"),
    portsEqual: beforePorts != null && beforePorts.join("\n") === afterPorts.join("\n"),
    beforeNames,
    afterNames,
    beforeVolumes,
    afterVolumes,
    error: null,
  };
} catch (error) {
  air.error = "docker read failed";
}

const portability = scanPortability(repoRoot);
const runtimeTestRun = runJson(process.execPath, [
  "--test",
  "tests/wtils/phase2a.test.mjs",
  "tests/wtils/phase2a-v.test.mjs",
  "tests/wtils/phase2a-v2.test.mjs",
]);
function lastCount(text, label) {
  const matches = [...text.matchAll(new RegExp(`^ℹ ${label} (\\d+)$`, "gm"))];
  return matches.length === 0 ? null : Number(matches[matches.length - 1][1]);
}
const runtimeText = `${runtimeTestRun.stdout}\n${runtimeTestRun.stderr}`;
const runtimePassed = lastCount(runtimeText, "pass");
const runtimeFailed = lastCount(runtimeText, "fail");
const runtimeTotal = lastCount(runtimeText, "tests");
const fullPassed = Number(registryTests.passed) + Number(runtimePassed);
const fullFailed = Number(registryTests.failed) + Number(runtimeFailed);
const freshHits = readdirSync(path.join(repoRoot, "tests/wtils"))
  .filter((name) => name.endsWith(".mjs"))
  .flatMap((name) => {
    const text = readFileSync(path.join(repoRoot, "tests/wtils", name), "utf8");
    const hits = [];
    if (text.includes("wm_api_inventory")) hits.push(`${name} requires an external API inventory`);
    if (text.includes("/tmp/")) hits.push(`${name} requires an external temp fixture`);
    return hits;
  });

function changedPaths() {
  const text = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").pop());
}
const changed = changedPaths();
const registryTouched = changed.filter((file) =>
  file.startsWith("wtils/config/registries/")
  || file.startsWith("wtils/scripts/registries/")
  || file.startsWith("wtils/tests/registries/"),
);
const schemaTouched = changed.filter((file) => file.startsWith("wtils/schemas/"));
const allowed = (file) =>
  file.startsWith("src/wtils/")
  || file.startsWith("tests/wtils/")
  || file.startsWith("scripts/wtils/")
  || file.startsWith("deploy/wtils/")
  || file.startsWith("docker/wtils/")
  || file.startsWith("wtils/phase2/runtime-v2-final/");
const upstreamTouched = changed.filter((file) => !allowed(file));
const secretPattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{12,}/;
let secretsFound = false;
for (const file of changed) {
  const full = path.join(repoRoot, file);
  if (!existsSync(full)) continue;
  if (secretPattern.test(readFileSync(full, "utf8"))) secretsFound = true;
}

const gates = {
  contract_version: CONTRACT_VERSION === "2.1.2" && registry.contractVersion === "2.1.2" ? "PASS" : "FAIL",
  registry_validator: validator.valid === true && validator.error_count === 0 && validatorRun.status === 0 ? "PASS" : "FAIL",
  registry_tests: registryTestRun.status === 0 && registryTests.failed === 0 ? "PASS" : "FAIL",
  runtime_tests: runtimeTestRun.status === 0 && runtimeFailed === 0 ? "PASS" : "FAIL",
  contract_conflicts: conflicts.length === 0 ? "PASS" : "FAIL",
  five_role_runtime: rolesOk ? "PASS" : "FAIL",
  profile_router: profileRouterOk ? "PASS" : "FAIL",
  method_router: methodRouterOk ? "PASS" : "FAIL",
  api_planner: apiPlannerOk ? "PASS" : "FAIL",
  method_version_runtime: versionsOk ? "PASS" : "FAIL",
  m21_runtime_semantics: m21Hits.length === 0 && m21Included.includes("GetRiskScores") && m21Included.includes("GetCountryRisk") ? "PASS" : "FAIL",
  a_state_runtime: aStateSampleOk && blockedResolved.source_state === "BLOCKED_STATIC_EVIDENCE" && blockedResolved.status === "RESOLVED" ? "PASS" : "FAIL",
  delivery_two_axis_runtime: deliveryViolations.length === 0 && artifactDeliveryOk ? "PASS" : "FAIL",
  request_contract_runtime: requestRefs === 237 ? "PASS" : "FAIL",
  request_body_runtime: bodyBound === 18 && bodyNotApplicable === 219 && bodyOther === 0 ? "PASS" : "FAIL",
  source_policy_runtime: sourceModesOk ? "PASS" : "FAIL",
  source_unknown_preserved: unknownClean ? "PASS" : "FAIL",
  research_artifact: schema.error_count === 0 && schemaRun.status === 0 && ARTIFACT_FIELDS.every((field) => field in pipeline.artifact) ? "PASS" : "FAIL",
  pit_runtime: pitOk ? "PASS" : "FAIL",
  delta_t_runtime: deltaOk ? "PASS" : "FAIL",
  revision_runtime: revisionOk ? "PASS" : "FAIL",
  hormuz_final_e2e: profileRouterOk && methodRouterOk && apiPlannerOk && pipeline.digest === second.digest ? "PASS" : "FAIL",
  external_gap_default_off: gaps.every((gap) => gap.enabled === false && gap.default_enabled === false) ? "PASS" : "FAIL",
  nas_absent_degradation: nasOk ? "PASS" : "FAIL",
  air_legacy_runtime_untouched: air.namesEqual && air.volumesEqual && air.portsEqual ? "PASS" : "FAIL",
  mac_studio_portability: portability.findings.length === 0 ? "PASS" : "FAIL",
  fresh_checkout: freshHits.length === 0 ? "PASS" : "FAIL",
  a23_expected: a23Ok ? "PASS" : "FAIL",
  a24_blocked: a24Ok ? "PASS" : "FAIL",
  ownership: registryTouched.length === 0 && schemaTouched.length === 0 && upstreamTouched.length === 0 && !secretsFound ? "PASS" : "FAIL",
};

const ready = Object.values(gates).every((status) => status === "PASS");
if (!ready && conflicts.length === 0) {
  const failedGates = Object.entries(gates).filter(([, status]) => status !== "PASS").map(([name]) => name);
  conflict("GATE_FAIL", `Gates failed: ${failedGates.join(", ")}.`);
}

writeJson("FINAL_RESEARCH_ARTIFACT.json", pipeline.artifact);
writeJson("FINAL_A23_RESULTS.json", {
  policy: a23.policy,
  counts: a23.counts,
  other: otherA23,
  total: a23.total,
  results: a23.results.map((row) => ({
    operation_id: row.operation_id,
    call_class: row.call_class,
    status: row.status,
    called: row.called,
  })),
});
writeJson("FINAL_A24_RESULTS.json", {
  counts: a24.counts,
  total: a24.total,
  rule: a24.rule,
  results: a24.results.map((row) => ({ operation_id: row.operation_id, status: row.status })),
});
writeJson("FINAL_CONTRACT_COMPATIBILITY.json", {
  static_baseline: STATIC_BASELINE,
  contract_version: CONTRACT_VERSION,
  methodology_version: "1.2.0",
  registry_validator: {
    valid: validator.valid,
    error_count: validator.error_count,
    warning_count: validator.warning_count,
    exit: validatorRun.status,
  },
  counts: {
    roles: registry.roles.length,
    profiles: registry.profiles.length,
    methodologies: registry.methods.length,
    apis: registry.apis.length,
    profile_relations: parity.profile_relations,
    profile_bindings: parity.profile_bindings,
    role_methodology_bindings: registry.bindings.role_methodology_bindings.length,
    request_contract_ref: requestRefs,
    request_body_bound: bodyBound,
    request_body_not_applicable: bodyNotApplicable,
  },
  hormuz: {
    expected_from_registry: { selected: expectedPlan.selected, governance: expectedPlan.governance },
    actual_runtime: { selected: actualSelected, governance: actualGovernance },
    match: sameSet(expectedPlan.selected, actualSelected) && sameSet(expectedPlan.governance, actualGovernance),
  },
  execution_class: {
    M06: classOf("M06"),
    M07: classOf("M07"),
    C01: classOf("C01"),
    C02: classOf("C02"),
    C05: classOf("C05"),
    C06: classOf("C06"),
    C07: classOf("C07"),
    normal_plan_leak: normalPlanLeak.map((row) => row.methodology_id),
  },
  m21_included: m21Included,
  schema_error_count: schema.error_count,
  gates,
  conflicts,
  pre_hardware_ready: ready ? "YES" : "NO",
});

const sourceStates = {};
for (const source of pipeline.artifact.sources) {
  sourceStates[source.verification_state] = (sourceStates[source.verification_state] ?? 0) + 1;
}
writeText("FINAL_HORMUZ_E2E.md", [
  "# FINAL_HORMUZ_E2E",
  "",
  `primary_profile_id: ${pipeline.artifact.primary_profile_id}`,
  `profile_ids: ${pipeline.artifact.profile_ids.join(", ")}`,
  `roles: ${roles.join(", ")}`,
  "TECH: OFF",
  "",
  "EXPECTED_FROM_REGISTRY selected:",
  "",
  ...expectedPlan.selected.map((id) => `- ${id}`),
  "",
  "ACTUAL_RUNTIME selected:",
  "",
  ...actualSelected.map((id) => `- ${id}`),
  "",
  "EXPECTED_FROM_REGISTRY governance:",
  "",
  ...expectedPlan.governance.map((id) => `- ${id}`),
  "",
  "ACTUAL_RUNTIME governance:",
  "",
  ...actualGovernance.map((id) => `- ${id}`),
  "",
  `Selection match: ${sameSet(expectedPlan.selected, actualSelected) && sameSet(expectedPlan.governance, actualGovernance) ? "YES" : "NO"}`,
  "",
  "M16 chokepoint graph:",
  "",
  ...planRows("M16").map((line) => `- ${line}`),
  "",
  "M21 country instability graph:",
  "",
  ...planRows("M21").map((line) => `- ${line}`),
  "",
  "C03:",
  "",
  ...planRows("C03").map((line) => `- ${line}`),
  "",
  "C04:",
  "",
  ...planRows("C04").map((line) => `- ${line}`),
  "",
  `Sources: ${pipeline.artifact.sources.length}`,
  `Source verification states: ${JSON.stringify(sourceStates)}`,
  `UNKNOWN rows with null publisher, provider, host, and transport: ${unknownClean ? "YES" : "NO"}`,
  `PIT fields: ${OBSERVATION_TIMESTAMPS.length}`,
  `Digest repeat: ${pipeline.digest === second.digest ? "YES" : "NO"}`,
  `Schema errors: ${schema.error_count}`,
  "",
].join("\n"));

writeText("FINAL_RUNTIME_VALIDATION.md", [
  "# FINAL_RUNTIME_VALIDATION",
  "",
  `Static baseline: ${STATIC_BASELINE}`,
  `Contract version: ${CONTRACT_VERSION}`,
  "Methodology version: 1.2.0",
  "",
  `- Roles: ${registry.roles.length}`,
  `- Profiles: ${registry.profiles.length}`,
  `- Methodologies: ${registry.methods.length}`,
  `- Canonical APIs: ${registry.apis.length}`,
  `- Profile relations: ${parity.profile_relations}`,
  `- Profile bindings: ${parity.profile_bindings}`,
  `- Role methodology bindings: ${registry.bindings.role_methodology_bindings.length}`,
  `- request_contract_ref: ${requestRefs}/237`,
  `- Request body BOUND: ${bodyBound}`,
  `- Request body NOT_APPLICABLE: ${bodyNotApplicable}`,
  `- Artifact fields: ${ARTIFACT_FIELDS.length}`,
  `- PIT fields: ${OBSERVATION_TIMESTAMPS.length}`,
  `- Strict schema errors: ${schema.error_count}`,
  "",
  "Runtime reads profile_methodology_bindings and checks them against profile.core_methodologies, triggered_methodologies, and audit_methodologies.",
  "NONCALLABLE and META stay out of the normal API plan. GOVERNANCE stays on the audit trace.",
  "A00-A22 state is the semantic authority. A23 and A24 stay single runtime statuses.",
  "No live write was sent. A23 used an empty environment and did not call fetch.",
  "",
  ...Object.entries(gates).map(([name, status]) => `- ${name}: ${status}`),
  "",
  `CONTRACT_CONFLICTS = ${conflicts.length}`,
  `PRE_HARDWARE_READY = ${ready ? "YES" : "NO"}`,
  "",
].join("\n"));

writeText("FINAL_TEST_REPORT.md", [
  "# FINAL_TEST_REPORT",
  "",
  "Registry validator: python3 wtils/scripts/registries/validate.py",
  `- exit: ${validatorRun.status}`,
  `- valid: ${validator.valid}`,
  `- error_count: ${validator.error_count}`,
  `- warning_count: ${validator.warning_count}`,
  "",
  "Registry tests ran before the runtime regression.",
  "Registry tests: python3 wtils/tests/registries/test_registries.py",
  `- exit: ${registryTestRun.status}`,
  `- passed: ${registryTests.passed}`,
  `- failed: ${registryTests.failed}`,
  `- negative_validator_proof_12_mutations: ${negativeProof ? `${negativeProof.status} ${negativeProof.detail}` : "MISSING"}`,
  "",
  "Runtime tests: node --test tests/wtils/phase2a.test.mjs tests/wtils/phase2a-v.test.mjs tests/wtils/phase2a-v2.test.mjs",
  `- exit: ${runtimeTestRun.status}`,
  `- tests: ${runtimeTotal}`,
  `- passed: ${runtimePassed}`,
  `- failed: ${runtimeFailed}`,
  "",
  `REGISTRY_TESTS = ${registryTests.passed}/${registryTests.failed}`,
  `RUNTIME_TESTS = ${runtimePassed}/${runtimeFailed}`,
  `FULL_TESTS = ${fullPassed}/${fullFailed}`,
  "",
  "The validator file was not modified. The negative proof remains inside the registry suite.",
  "Runtime tests do not require an external inventory file.",
  "",
].join("\n"));

writeText("FINAL_AIR_SAFETY.md", [
  "# FINAL_AIR_SAFETY",
  "",
  "Host role: DEVELOPMENT_ONLY.",
  "",
  `Container names before: ${air.beforeNames ? air.beforeNames.length : "UNAVAILABLE"}`,
  `Container names after: ${air.afterNames ? air.afterNames.length : "UNAVAILABLE"}`,
  `Names unchanged: ${air.namesEqual ? "YES" : "NO"}`,
  `Volumes before: ${air.beforeVolumes ? air.beforeVolumes.length : "UNAVAILABLE"}`,
  `Volumes after: ${air.afterVolumes ? air.afterVolumes.length : "UNAVAILABLE"}`,
  `Volumes unchanged: ${air.volumesEqual ? "YES" : "NO"}`,
  `Ports unchanged: ${air.portsEqual ? "YES" : "NO"}`,
  air.error ? `Docker read: ${air.error}` : "Docker read: names, volume names, and port mappings were compared.",
  "",
  "Port mappings were compared in memory and are not copied here.",
  "",
  "Not done:",
  "",
  "- no container stop or start",
  "- no volume delete",
  "- no Redis mutation",
  "- no secret rotation",
  "- no existing service change",
  "- overlay profile was not started",
  "",
  "Container names:",
  "",
  ...(air.afterNames ?? []).map((name) => `- ${name}`),
  "",
  `AIR_LEGACY_RUNTIME_UNTOUCHED = ${gates.air_legacy_runtime_untouched}`,
  "",
].join("\n"));

writeText("FINAL_PORTABILITY.md", [
  "# FINAL_PORTABILITY",
  "",
  portability.findings.length === 0 ? "Scan: PASS" : "Scan: FAIL",
  "",
  `Files scanned: ${portability.files_scanned}`,
  "",
  "Checked src/wtils, docker/wtils, deploy/wtils, and scripts/wtils for a user home, a username, the current machine hostname, an IP literal, a NAS volume path, a NAS share path, a pinned model endpoint, and a floating Redis tag under docker/wtils and deploy/wtils.",
  "",
  portability.findings.length === 0 ? "No hits." : portability.findings.map((line) => `- ${line}`).join("\n"),
  "",
  `Fresh checkout external fixtures: ${freshHits.length === 0 ? "NONE" : freshHits.join("; ")}`,
  "",
  "MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE",
  "NAS_REAL_MOUNT = WAITING_HARDWARE",
  "NAS_IO_BENCHMARK = WAITING_HARDWARE",
  "REAL_24H_STABILITY = WAITING_HARDWARE",
  "REAL_72H_STABILITY = WAITING_HARDWARE",
  "",
].join("\n"));

writeText("PRE_HARDWARE_READINESS.md", [
  "# PRE_HARDWARE_READINESS",
  "",
  `STATIC_BASELINE = ${STATIC_BASELINE}`,
  `CONTRACT_VERSION = ${CONTRACT_VERSION}`,
  `REGISTRY_VALIDATOR = ${gates.registry_validator}`,
  `REGISTRY_TESTS = ${registryTests.passed}/${registryTests.failed}`,
  `RUNTIME_TESTS = ${runtimePassed}/${runtimeFailed}`,
  `FULL_TESTS = ${fullPassed}/${fullFailed}`,
  `CONTRACT_CONFLICTS = ${conflicts.length}`,
  `HORMUZ_SCHEMA_ERRORS = ${schema.error_count}`,
  `A23 LIVE_VERIFIED = ${a23.counts.LIVE_VERIFIED}`,
  `A23 BLOCKED_AUTH = ${a23.counts.BLOCKED_AUTH}`,
  `A23 NOT_SAFE_TO_CALL = ${a23.counts.NOT_SAFE_TO_CALL}`,
  `A23 OTHER = ${otherA23}`,
  `A24 ACCEPTED = ${a24.counts.ACCEPTED}`,
  `A24 PARTIAL = ${a24.counts.PARTIAL}`,
  `A24 BLOCKED = ${a24.counts.BLOCKED}`,
  `A24 FAILED = ${a24.counts.FAILED}`,
  "DEDICATED_RESEARCH_STORE = JUSTIFIED",
  "RESEARCH_STORE_TECHNOLOGY = UNBOUND",
  `NAS_ABSENT_DEGRADATION = ${gates.nas_absent_degradation}`,
  `AIR_LEGACY_RUNTIME_UNTOUCHED = ${gates.air_legacy_runtime_untouched}`,
  `MAC_STUDIO_PORTABILITY = ${gates.mac_studio_portability}`,
  `FRESH_CHECKOUT_COMPATIBLE = ${gates.fresh_checkout}`,
  `UPSTREAM_FILES_MODIFIED = ${upstreamTouched.length === 0 ? "NO" : "YES"}`,
  `REGISTRY_FILES_MODIFIED = ${registryTouched.length === 0 ? "NO" : "YES"}`,
  `SCHEMA_FILES_MODIFIED = ${schemaTouched.length === 0 ? "NO" : "YES"}`,
  `SECRETS_FOUND = ${secretsFound ? "YES" : "NO"}`,
  "MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE",
  "NAS_REAL_MOUNT = WAITING_HARDWARE",
  "NAS_IO_BENCHMARK = WAITING_HARDWARE",
  "REAL_24H_STABILITY = WAITING_HARDWARE",
  "REAL_72H_STABILITY = WAITING_HARDWARE",
  "",
  `PRE_HARDWARE_READY = ${ready ? "YES" : "NO"}`,
  "NEXT = STOP",
  "",
].join("\n"));

if (conflicts.length > 0) {
  writeText("FINAL_CONTRACT_CONFLICT_REPORT.md", [
    "# FINAL_CONTRACT_CONFLICT_REPORT",
    "",
    "Registry and schema files were not modified.",
    "",
    ...conflicts.flatMap((item) => [`## ${item.id}`, "", item.summary, ""]),
    "",
    "PRE_HARDWARE_READY = NO",
    "",
  ].join("\n"));
}

console.log(JSON.stringify({
  ready: ready ? "YES" : "NO",
  conflicts: conflicts.map((item) => item.id),
  gates,
  a23: a23.counts,
  otherA23,
  a24: a24.counts,
  schema_errors: schema.error_count,
  registry_tests: { passed: registryTests.passed, failed: registryTests.failed, negative: negativeProof?.detail ?? null },
  runtime_tests: { total: runtimeTotal, passed: runtimePassed, failed: runtimeFailed, exit: runtimeTestRun.status },
  full_tests: { passed: fullPassed, failed: fullFailed },
  validator: { valid: validator.valid, error_count: validator.error_count, warning_count: validator.warning_count },
  air: {
    names: air.namesEqual,
    volumes: air.volumesEqual,
    ports: air.portsEqual,
    before_names: air.beforeNames?.length ?? null,
    after_names: air.afterNames?.length ?? null,
    before_volumes: air.beforeVolumes?.length ?? null,
    after_volumes: air.afterVolumes?.length ?? null,
  },
  portability: portability.findings,
  ownership: { upstream: upstreamTouched, registry: registryTouched, schema: schemaTouched, secrets: secretsFound },
  digest_match: pipeline.digest === second.digest,
}, null, 2));
