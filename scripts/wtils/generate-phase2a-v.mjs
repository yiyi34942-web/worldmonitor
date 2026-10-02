import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadRegistry, repoRoot, runA23, runA24, runPipeline, scanPortability } from "../../src/wtils/index.mjs";

const keyNames = ["WTILS_API_KEY", "WORLDMONITOR_API_KEY", "WM_API_KEY", "API_KEY", "WORLD_MONITOR_API_KEY"];
const presentKeys = keyNames.filter((name) => Boolean(process.env[name]));
const outDir = path.join(repoRoot, "wtils", "phase2", "runtime-revalidation");
mkdirSync(outDir, { recursive: true });

if (presentKeys.length > 0) {
  writeFileSync(
    path.join(outDir, "CONTRACT_CONFLICT_REPORT.md"),
    [
      "# CONTRACT_CONFLICT_REPORT",
      "",
      "STOP_AND_REPORT_CREDENTIAL_AVAILABLE",
      "",
      "An operator API key name is set in the environment. The key was not read and was not used.",
      "",
      ...presentKeys.map((name) => `- ${name}`),
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ stop: "STOP_AND_REPORT_CREDENTIAL_AVAILABLE", names: presentKeys }));
  process.exit(2);
}

const registry = loadRegistry();
const hormuz = JSON.parse(readFileSync(path.join(repoRoot, "wtils/phase2/fixtures/hormuz-disruption.json"), "utf8"));
const pipeline = runPipeline(registry, hormuz, { artifact_id: hormuz.artifact_id, created_at: hormuz.as_of });
const a23 = await runA23(registry, { env: {} });
const a24 = runA24(registry);

const markers = [
  ["M01", ["classification_result", "Classify event"]],
  ["M02", ["anomaly_flags", "temporal baseline"]],
  ["M04", ["intensity_score", "ACLED"]],
  ["M05", ["network_graph", "sanctions"]],
  ["M09", ["cot_data", "COT"]],
  ["M10", ["yield_data", "curve_shape", "inversion"]],
  ["M11", ["comtrade", "flow_summary"]],
  ["M13", ["dependency_map"]],
  ["M14", ["chokepoint_status", "bypass"]],
  ["M15", ["technical_signals"]],
  ["M16", ["stress_index", "bottleneck_map"]],
  ["M21", ["cii_compliance_map", "vessel_data", "scrubber", "carbon", "imo"]],
  ["M22", ["velocity_score", "social_media_data"]],
  ["C05", ["META_ROUTER"]],
];

function payloadText(method) {
  return JSON.stringify({
    required_inputs: method.required_inputs,
    enrichment_inputs: method.enrichment_inputs,
    output_bindings: method.output_bindings,
    rules_structured: method.rules_structured,
    limitations: method.limitations,
    trigger_conditions: method.trigger_conditions,
  });
}

const payloadHits = [];
for (const [id, needles] of markers) {
  const method = registry.byId.methodology.get(id);
  const text = payloadText(method);
  const found = needles.filter((needle) => text.toLowerCase().includes(needle.toLowerCase()));
  if (found.length > 0) {
    payloadHits.push({ methodology_id: id, canonical_name: method.canonical_name, found });
  }
}

const deliveryUnbound = registry.apis.filter((api) => api.primary_delivery_mode == null || api.cache_semantics == null).length;
const bodyUnbound = registry.apis.filter((api) => ["POST", "PUT", "PATCH"].includes(String(api.http_method).toUpperCase()) && !api.request_body_schema_ref).length;
const schemaDeliveryErrors = pipeline.validation.errors.filter(
  (error) => error.includes("primary_delivery_mode") || error.includes("cache_semantics"),
).length;

const conflicts = [
  {
    id: "METHOD_PAYLOAD_NARRATIVE",
    summary: "Methodology canonical names and execution classes are current. Narrative payload fields still describe older domains. Runtime routes from canonical name, execution class, and the binding graph, and does not copy those payload fields.",
    hits: payloadHits,
  },
  {
    id: "M21_CANONICAL_NAME",
    summary: "Registry canonical_name for M21 is CII Risk Scoring. The revalidation brief names the same method Country Instability / Intelligence Risk. Runtime keeps the registry name and plans GetRiskScores, GetCountryRisk, and ListCrossSourceSignals.",
  },
  {
    id: "DELIVERY_TWO_AXIS_UNBOUND",
    summary: `${deliveryUnbound} of 237 operations have a null primary_delivery_mode or cache_semantics. Runtime emits null. It does not copy delivery_semantics_ref into the two-axis fields.`,
  },
  {
    id: "ARTIFACT_SCHEMA_DELIVERY_ENUM",
    summary: `The research artifact schema types primary_delivery_mode and cache_semantics as non-null enums. The Hormuz artifact keeps registry nulls, so schema validation reports ${schemaDeliveryErrors} enum errors. Those nulls are not replaced.`,
  },
  {
    id: "REQUEST_BODY_SCHEMA_UNBOUND",
    summary: `${bodyUnbound} operations with a body have request_body_schema_ref null. Runtime resolves request_contract_ref for every operation and leaves the body ref null. The missing body ref is non-blocking.`,
  },
];

writeFileSync(path.join(outDir, "CONTRACT_CONFLICT_REPORT.md"), [
  "# CONTRACT_CONFLICT_REPORT",
  "",
  "Registry and schema files were not modified.",
  "",
  ...conflicts.flatMap((conflict) => [
    `## ${conflict.id}`,
    "",
    conflict.summary,
    "",
    ...(conflict.hits ?? []).map((hit) => `- ${hit.methodology_id} ${hit.canonical_name}: ${hit.found.join(", ")}`),
    "",
  ]),
].join("\n"));

writeFileSync(path.join(outDir, "RESEARCH_ARTIFACT_V2_1_SAMPLE.json"), `${JSON.stringify(pipeline.artifact, null, 2)}\n`);

const a23Compact = {
  policy: a23.policy,
  counts: a23.counts,
  total: a23.total,
  results: a23.results.map((row) => ({
    operation_id: row.operation_id,
    call_class: row.call_class,
    status: row.status,
    called: row.called,
  })),
};
writeFileSync(path.join(outDir, "API_A23_REVALIDATION.json"), `${JSON.stringify(a23Compact, null, 2)}\n`);
writeFileSync(path.join(outDir, "API_A24_REVALIDATION.json"), `${JSON.stringify({
  counts: a24.counts,
  total: a24.total,
  rule: a24.rule,
  results: a24.results.map((row) => ({ operation_id: row.operation_id, status: row.status })),
}, null, 2)}\n`);

const included = (id) => pipeline.result.api_plan.operations
  .filter((row) => row.methodology_id === id)
  .map((row) => `${row.level} ${row.classification} ${row.operation_id} included=${row.included}`);

writeFileSync(path.join(outDir, "HORMUZ_V2_1_E2E.md"), [
  "# HORMUZ_V2_1_E2E",
  "",
  `Catalog: ${pipeline.result.catalog.catalog_ids.join(", ")}`,
  `primary_profile_id: ${pipeline.artifact.primary_profile_id}`,
  `profile_ids: ${pipeline.artifact.profile_ids.join(", ")}`,
  `roles: ${pipeline.result.roles.roles.join(", ")}`,
  `TECH: ${pipeline.result.roles.roles.includes("TECH") ? "ON" : "OFF"}`,
  "",
  "Executed methodologies:",
  "",
  ...pipeline.artifact.methodologies.filter((row) => row.trace_state === "EXECUTED").map((row) => `- ${row.id} ${row.execution_class} ${row.trace_state}`),
  "",
  "Governance trace:",
  "",
  ...pipeline.artifact.methodologies.filter((row) => row.trace_state === "GOVERNANCE_TRACE").map((row) => `- ${row.id} ${row.execution_class} ${row.trace_state}`),
  "",
  "M16 chokepoint graph:",
  "",
  ...included("M16").map((line) => `- ${line}`),
  "",
  "M21 country risk graph:",
  "",
  ...included("M21").map((line) => `- ${line}`),
  "",
  "C03 convergence graph:",
  "",
  ...included("C03").map((line) => `- ${line}`),
  "",
  "C04 strategic graph:",
  "",
  ...included("C04").map((line) => `- ${line}`),
  "",
  `PIT event_time: ${pipeline.artifact.pit.event_time}`,
  `PIT original_publish_time: ${pipeline.artifact.pit.original_publish_time}`,
  `PIT wm_first_seen_time: ${pipeline.artifact.pit.wm_first_seen_time}`,
  `PIT source_observed_time: ${pipeline.artifact.pit.source_observed_time}`,
  "",
  "wm_first_seen_time stays null. source_observed_time stays null.",
  "",
  ...pipeline.outputs.map((output) => `- ${output.output_type}: ${output.status}`),
  "",
  `Persistence: ${pipeline.persistence.state}`,
  `Storage realtime: ${pipeline.result.storage.realtime}`,
  `Knowledge promotion: ${pipeline.result.storage.knowledge_promotion}`,
  `Large snapshot: ${pipeline.result.storage.large_snapshot}`,
  `Digest: ${pipeline.digest}`,
  "",
].join("\n"));

function lines(file) {
  return readFileSync(file, "utf8").trim().split("\n").filter(Boolean).sort();
}
const beforeNames = lines("/tmp/wtils-p2av-docker-names-before.txt");
const beforeVolumes = lines("/tmp/wtils-p2av-docker-vols-before.txt");
const beforePorts = lines("/tmp/wtils-p2av-docker-ports-before.txt");
const afterNames = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
const afterVolumes = execFileSync("docker", ["volume", "ls", "--format", "{{.Name}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
const afterPorts = execFileSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
const namesEqual = beforeNames.join("\n") === afterNames.join("\n");
const volumesEqual = beforeVolumes.join("\n") === afterVolumes.join("\n");
const portsEqual = beforePorts.join("\n") === afterPorts.join("\n");

writeFileSync(path.join(outDir, "AIR_SAFETY_REVALIDATION.md"), [
  "# AIR_SAFETY_REVALIDATION",
  "",
  "Host role: DEVELOPMENT_ONLY.",
  "",
  `Container names before: ${beforeNames.length}`,
  `Container names after: ${afterNames.length}`,
  `Names unchanged: ${namesEqual ? "YES" : "NO"}`,
  `Volumes unchanged: ${volumesEqual ? "YES" : "NO"}`,
  `Ports unchanged: ${portsEqual ? "YES" : "NO"}`,
  "",
  "Read-only checks: container names, volume names, and port mappings.",
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
  ...beforeNames.map((name) => `- ${name}`),
  "",
  namesEqual && volumesEqual && portsEqual ? "AIR_LEGACY_RUNTIME_UNTOUCHED = PASS" : "AIR_LEGACY_RUNTIME_UNTOUCHED = FAIL",
  "",
].join("\n"));

const portability = scanPortability(repoRoot);
writeFileSync(path.join(outDir, "PORTABILITY_REVALIDATION.md"), [
  "# PORTABILITY_REVALIDATION",
  "",
  portability.findings.length === 0 ? "Scan: PASS" : "Scan: FAIL",
  "",
  `Files scanned: ${portability.files_scanned}`,
  "",
  "Checked src/wtils, docker/wtils, deploy/wtils, and scripts/wtils for a user home, a username, an IP literal, a NAS volume path, a pinned model endpoint, and a floating Redis tag under docker/wtils and deploy/wtils.",
  "",
  portability.findings.length === 0 ? "No hits." : portability.findings.map((line) => `- ${line}`).join("\n"),
  "",
  "MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE",
  "NAS_REAL_MOUNT = WAITING_HARDWARE",
  "NAS_IO_BENCHMARK = WAITING_HARDWARE",
  "REAL_24H_STABILITY = WAITING_HARDWARE",
  "REAL_72H_STABILITY = WAITING_HARDWARE",
  "",
].join("\n"));

const testRun = spawnSync(process.execPath, ["--test", "tests/wtils/phase2a.test.mjs", "tests/wtils/phase2a-v.test.mjs"], {
  cwd: repoRoot,
  encoding: "utf8",
});
const testText = `${testRun.stdout ?? ""}\n${testRun.stderr ?? ""}`;
const summary = testText.split("\n").filter((line) => line.includes("tests ") || line.includes("pass ") || line.includes("fail ") || line.startsWith("✔") || line.startsWith("✖") || line.startsWith("ℹ"));
writeFileSync(path.join(outDir, "TEST_REPORT.md"), [
  "# TEST_REPORT",
  "",
  "Command: node --test tests/wtils/phase2a.test.mjs tests/wtils/phase2a-v.test.mjs",
  `Exit: ${testRun.status}`,
  "",
  ...summary,
  "",
].join("\n"));

const otherA23 = a23.total - a23.counts.LIVE_VERIFIED - a23.counts.BLOCKED_AUTH - a23.counts.NOT_SAFE_TO_CALL;
writeFileSync(path.join(outDir, "UNRESOLVED_PRE_HARDWARE_ITEMS.md"), [
  "# UNRESOLVED_PRE_HARDWARE_ITEMS",
  "",
  `- A23 LIVE_VERIFIED = ${a23.counts.LIVE_VERIFIED}. BLOCKED_AUTH = ${a23.counts.BLOCKED_AUTH}. NOT_SAFE_TO_CALL = ${a23.counts.NOT_SAFE_TO_CALL}. OTHER = ${otherA23}.`,
  `- A24 ACCEPTED = ${a24.counts.ACCEPTED}. PARTIAL = ${a24.counts.PARTIAL}. BLOCKED = ${a24.counts.BLOCKED}. FAILED = ${a24.counts.FAILED}.`,
  "- No operator API key was present. Live calls were not forged.",
  `- Delivery two-axis is unbound on ${deliveryUnbound} operations. See CONTRACT_CONFLICT_REPORT.md.`,
  `- Methodology narrative payloads still disagree with canonical names for ${payloadHits.length} methods. Registry was not edited.`,
  "- Output stubs remain for ALERT, WATCH_STATE, BACKTEST_ARTIFACT, KNOWLEDGE_PACKAGE, CURRICULUM_PACKAGE, and TRAINING_SAMPLE.",
  "- DEDICATED_RESEARCH_STORE = JUSTIFIED. IMPLEMENTATION_TECHNOLOGY = UNBOUND. No database was deployed.",
  "- NAS_PRESENT = false. Research persistence is MEMORY for the in-process adapter and QUEUED in storage policy. Knowledge promotion is BLOCKED_STORAGE. Large snapshot is DEFERRED.",
  "",
  "MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE",
  "NAS_REAL_MOUNT = WAITING_HARDWARE",
  "NAS_IO_BENCHMARK = WAITING_HARDWARE",
  "REAL_24H_STABILITY = WAITING_HARDWARE",
  "REAL_72H_STABILITY = WAITING_HARDWARE",
  "",
  "NEXT = STOP",
  "",
].join("\n"));

const structuralErrors = pipeline.validation.errors.filter(
  (error) => !error.includes("primary_delivery_mode") && !error.includes("cache_semantics"),
);
writeFileSync(path.join(outDir, "RUNTIME_V2_1_VALIDATION.md"), [
  "# RUNTIME_V2_1_VALIDATION",
  "",
  "Contract baseline: df11ca6e1a15a4dd6b11be320bd0c42d59f79988",
  "Contract version: 2.1.0",
  "",
  `- Roles: ${registry.roles.length}`,
  `- Methodologies: ${registry.methods.length}`,
  `- API operations: ${registry.apis.length}`,
  `- request_contract_ref: ${registry.apis.filter((api) => api.request_contract_ref).length}/237`,
  `- Artifact fields: ${Object.keys(pipeline.artifact).length}`,
  `- PIT fields: ${Object.keys(pipeline.artifact.pit).length}`,
  "- Research store: JUSTIFIED / UNBOUND",
  "",
  `Schema-structural errors excluding unbound delivery enums: ${structuralErrors.length}`,
  `Delivery enum schema errors retained as conflicts: ${schemaDeliveryErrors}`,
  "",
  "Runtime gates:",
  "",
  "- Method routing uses canonical name, provenance class, execution class, and bindings.",
  "- NONCALLABLE and META stay out of the API plan.",
  "- C06 and C07 are governance traces.",
  "- Artifact uses primary_profile_id and profile_ids.",
  "- Sources keep nulls and UNKNOWN.",
  "- Missing PIT timestamps stay null.",
  "- delta_t duration_ms is null when a timestamp is missing.",
  "- revision is an append-only object.",
  "",
  `A23 LIVE_VERIFIED ${a23.counts.LIVE_VERIFIED}, BLOCKED_AUTH ${a23.counts.BLOCKED_AUTH}, NOT_SAFE_TO_CALL ${a23.counts.NOT_SAFE_TO_CALL}, OTHER ${otherA23}`,
  `A24 ACCEPTED ${a24.counts.ACCEPTED}, PARTIAL ${a24.counts.PARTIAL}, BLOCKED ${a24.counts.BLOCKED}, FAILED ${a24.counts.FAILED}`,
  `Air names/volumes/ports unchanged: ${namesEqual && volumesEqual && portsEqual ? "YES" : "NO"}`,
  `Portability findings: ${portability.findings.length}`,
  `Tests exit: ${testRun.status}`,
  "",
  "Registry files were not modified.",
  "",
].join("\n"));

console.log(JSON.stringify({
  a23: a23.counts,
  a24: a24.counts,
  otherA23,
  deliveryUnbound,
  bodyUnbound,
  payloadHits: payloadHits.map((hit) => hit.methodology_id),
  schemaDeliveryErrors,
  structuralErrors: structuralErrors.length,
  air: { namesEqual, volumesEqual, portsEqual, names: beforeNames.length, volumes: beforeVolumes.length },
  portability: portability.findings.length,
  tests_exit: testRun.status,
  digest: pipeline.digest,
}, null, 2));
