import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repo root derived from this module. No user home and no host path is pinned. */
export const repoRoot = path.resolve(here, "../..");

export const FIVE_ROLES = Object.freeze([
  "WORLD",
  "TECH",
  "FINANCE",
  "COMMODITY",
  "ENERGY",
]);

export const FORBIDDEN_ROLES = Object.freeze([
  "INFRASTRUCTURE",
  "SYS",
  "OPS",
  "ADMIN",
]);

/** Scope classes are not roles. */
export const SCOPE_CLASSES = Object.freeze([
  "SYSTEM",
  "ADMIN",
  "ORCHESTRATION",
]);

export const EXECUTION_CLASSES = Object.freeze([
  "DIRECT_API",
  "COMPOSITE",
  "NONCALLABLE",
  "META",
  "GOVERNANCE",
]);

export const DELIVERY_MODES = Object.freeze([
  "REQUEST",
  "SEEDED",
  "SEED_FIRST_GAP",
  "POLL",
  "STREAM",
  "RELAY",
  "WEBHOOK",
  "CACHE",
  "ASYNC_JOB",
]);

/** Observation lineage. Missing values stay null. Registry PIT metadata is separate. */
export const OBSERVATION_TIMESTAMPS = Object.freeze([
  "event_time",
  "original_publish_time",
  "source_observed_time",
  "wm_first_seen_time",
  "webhook_emitted_time",
  "webhook_received_time",
  "normalized_time",
  "methodology_started_time",
  "methodology_completed_time",
  "analyst_available_time",
  "market_first_reaction_time",
  "research_snapshot_time",
  "outcome_time",
]);

export const CONTRACT_VERSION = "2.1.2";

/** Research Artifact contract v2.1. The builder emits every field. */
export const ARTIFACT_FIELDS = Object.freeze([
  "artifact_id",
  "artifact_version",
  "event_id",
  "created_at",
  "as_of_time",
  "query",
  "intent",
  "primary_profile_id",
  "profile_ids",
  "roles",
  "role_weights",
  "methodologies",
  "apis",
  "sources",
  "pit",
  "timeline",
  "evidence",
  "contradictions",
  "unknowns",
  "market_reaction",
  "delta_t",
  "replay",
  "backtest",
  "confidence",
  "promotion_status",
  "revision",
]);

export const EIGHT_REGISTRIES = Object.freeze([
  ["R1", "profiles", "profiles.json"],
  ["R2", "roles", "roles.json"],
  ["R3", "methodologies", "methodologies.json"],
  ["R4", "apis", "apis.json"],
  ["R5", "delivery", "delivery_semantics.json"],
  ["R6", "sources", "sources.json"],
  ["R7", "contracts", "contracts.json"],
  ["R8", "pit", "pit_contract.json"],
]);

const SUPPORTING = Object.freeze([
  ["bindings", "bindings.json"],
  ["data_states", "data_states.json"],
  ["intelligence_catalog", "intelligence_catalog.json"],
  ["outputs", "outputs.json"],
]);

const A_FIELDS = Object.freeze([
  "a00_registered",
  "a01_http_method_verified",
  "a02_canonical_route_verified",
  "a03_auth_defined",
  "a04_entitlement_defined",
  "a05_declared_availability",
  "a06_request_schema_bound",
  "a07_response_schema_bound",
  "a08_nullability_bound",
  "a09_source_bound",
  "a10_attribution_bound",
  "a11_delivery_bound",
  "a12_seed_cache_bound",
  "a13_freshness_bound",
  "a14_lifecycle_bound",
  "a15_contract_version_bound",
  "a16_role_bound",
  "a17_methodology_bound",
  "a18_profile_bound",
  "a19_rate_limit_bound",
  "a20_jmespath_bound",
  "a21_pagination_truncation_bound",
  "a22_error_semantics_bound",
]);

export class BaselineError extends Error {
  constructor(message, code = "STOP_AND_REPORT_BASELINE_MISMATCH") {
    super(message);
    this.name = "BaselineError";
    this.code = code;
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function expectCount(label, actual, expected) {
  if (actual !== expected) {
    throw new BaselineError(`${label} count ${actual}, expected ${expected}`);
  }
}

function assertContractBaseline(root, loaded, methods, apis) {
  const version = loaded.registriesVersion?.new_version;
  if (version !== CONTRACT_VERSION) {
    throw new BaselineError(`contract version ${version ?? "missing"}, expected ${CONTRACT_VERSION}`);
  }
  const withContractRef = apis.filter(
    (api) => typeof api.request_contract_ref === "string" && api.request_contract_ref.length > 0,
  );
  if (withContractRef.length !== apis.length) {
    throw new BaselineError(`request_contract_ref ${withContractRef.length}/${apis.length}`);
  }
  for (const api of apis) {
    for (const key of Object.keys(api)) {
      if (key.endsWith("_state_state")) {
        throw new BaselineError(`${api.operation_id} still has ${key}`);
      }
    }
  }
  for (const method of methods) {
    if ("legacy_classification" in method) {
      throw new BaselineError(`${method.methodology_id} still has legacy_classification`);
    }
    if (!method.provenance_class || !method.execution_class) {
      throw new BaselineError(`${method.methodology_id} missing two-axis classification`);
    }
  }
  const props = loaded.researchArtifactSchema.properties ?? {};
  if (Object.keys(props).length !== ARTIFACT_FIELDS.length) {
    throw new BaselineError(`research artifact properties ${Object.keys(props).length}, expected ${ARTIFACT_FIELDS.length}`);
  }
  for (const field of ARTIFACT_FIELDS) {
    if (!(field in props)) {
      throw new BaselineError(`research artifact schema missing ${field}`);
    }
  }
  const pitFields = Object.keys(loaded.pit.timestamp_fields ?? {});
  if (pitFields.length !== OBSERVATION_TIMESTAMPS.length) {
    throw new BaselineError(`PIT observation fields ${pitFields.length}, expected ${OBSERVATION_TIMESTAMPS.length}`);
  }
  for (const field of OBSERVATION_TIMESTAMPS) {
    if (!pitFields.includes(field)) {
      throw new BaselineError(`PIT contract missing ${field}`);
    }
  }
  const persistencePath = path.join(root, "wtils", "docs", "contracts", "RESEARCH_PERSISTENCE_REQUIREMENTS.md");
  const persistence = readFileSync(persistencePath, "utf8");
  if (!persistence.includes("DEDICATED_RESEARCH_STORE = JUSTIFIED")) {
    throw new BaselineError("research store is not JUSTIFIED");
  }
  if (!persistence.includes("IMPLEMENTATION_TECHNOLOGY = UNBOUND")) {
    throw new BaselineError("research store technology is not UNBOUND");
  }
  const apiItemProps = props.apis?.items?.properties ?? {};
  for (const field of ["delivery_binding_state", "cache_binding_state", "primary_delivery_mode", "cache_semantics"]) {
    if (!(field in apiItemProps)) {
      throw new BaselineError(`research artifact api item missing ${field}`);
    }
  }
  for (const method of methods) {
    if (method.version !== "1.2.0") {
      throw new BaselineError(`${method.methodology_id} version ${method.version ?? "missing"}, expected 1.2.0`);
    }
    if ("methodology_version" in method) {
      throw new BaselineError(`${method.methodology_id} still has methodology_version`);
    }
    if (!method.methodology_version_hash) {
      throw new BaselineError(`${method.methodology_id} missing methodology_version_hash`);
    }
    if (!method.source_binding_mode || !method.source_policy) {
      throw new BaselineError(`${method.methodology_id} missing source policy`);
    }
    if (!["EXPLICIT", "INHERIT_FROM_API_BINDINGS", "NONE"].includes(method.source_binding_mode)) {
      throw new BaselineError(`${method.methodology_id} source_binding_mode ${method.source_binding_mode}`);
    }
    if (method.source_binding_mode === "NONE" && !["NONCALLABLE", "META", "GOVERNANCE"].includes(method.execution_class)) {
      throw new BaselineError(`${method.methodology_id} NONE source mode on ${method.execution_class}`);
    }
  }
  let bodyBound = 0;
  let bodyNotApplicable = 0;
  let bodyOther = 0;
  for (const api of apis) {
    const ref = api.request_body_schema_ref;
    if (ref === "NOT_APPLICABLE") bodyNotApplicable += 1;
    else if (typeof ref === "string" && ref.length > 0) bodyBound += 1;
    else bodyOther += 1;
    if (api.a11_delivery_bound_state === "VERIFIED" && !api.primary_delivery_mode) {
      throw new BaselineError(`${api.operation_id} delivery VERIFIED without primary_delivery_mode`);
    }
    if (api.a12_seed_cache_bound_state === "VERIFIED" && !api.cache_semantics) {
      throw new BaselineError(`${api.operation_id} cache VERIFIED without cache_semantics`);
    }
    for (const [key, value] of Object.entries(api)) {
      if (!key.endsWith("_state") || key === "a23_state" || key === "a24_state") continue;
      const baseKey = key.slice(0, -"_state".length);
      if (!(baseKey in api)) throw new BaselineError(`${api.operation_id} ${key} missing base`);
      const base = api[baseKey];
      if (value === "VERIFIED" && base !== true) {
        throw new BaselineError(`${api.operation_id} ${key} VERIFIED with base ${base}`);
      }
      if ((value === "NOT_APPLICABLE" || value === "BLOCKED_STATIC_EVIDENCE") && base !== false) {
        throw new BaselineError(`${api.operation_id} ${key} ${value} with base ${base}`);
      }
    }
  }
  if (bodyBound !== 18 || bodyNotApplicable !== 219 || bodyOther !== 0) {
    throw new BaselineError(`request body bound ${bodyBound} not_applicable ${bodyNotApplicable} other ${bodyOther}`);
  }
  const profiles = loaded.profiles.entries ?? [];
  const profileBindings = loaded.bindings.profile_methodology_bindings ?? [];
  const roleBindings = loaded.bindings.role_methodology_bindings ?? [];
  expectCount("role_methodology_bindings", roleBindings.length, 100);
  const relationKey = (profileId, methodologyId, bindingType, trigger) =>
    `${profileId}|${methodologyId}|${bindingType}|${trigger ?? ""}`;
  const embedded = new Set();
  for (const profile of profiles) {
    for (const methodologyId of profile.core_methodologies ?? []) {
      embedded.add(relationKey(profile.profile_id, methodologyId, "CORE", null));
    }
    for (const triggered of profile.triggered_methodologies ?? []) {
      embedded.add(relationKey(profile.profile_id, triggered.methodology_id, "TRIGGERED", triggered.trigger));
    }
    for (const methodologyId of profile.audit_methodologies ?? []) {
      embedded.add(relationKey(profile.profile_id, methodologyId, "AUDIT", null));
    }
  }
  const bound = new Set(
    profileBindings.map((row) => relationKey(row.profile_id, row.methodology_id, row.binding_type, row.trigger)),
  );
  if (embedded.size !== 85 || bound.size !== 85 || [...embedded].some((key) => !bound.has(key))) {
    throw new BaselineError(`profile method relations ${embedded.size} bindings ${bound.size}`);
  }
}

/**
 * Load the Phase 1 registries. Fail closed when a required file or count is missing.
 * This function never writes registry files.
 */
export function loadRegistry(root = repoRoot) {
  const dir = path.join(root, "wtils", "config", "registries");
  const schemaPath = path.join(root, "wtils", "schemas", "research", "research_artifact_schema.json");
  const loaded = {};
  try {
    for (const [id, key, file] of EIGHT_REGISTRIES) {
      loaded[key] = readJson(path.join(dir, file));
      loaded[key].registry_id = id;
    }
    for (const [key, file] of SUPPORTING) {
      loaded[key] = readJson(path.join(dir, file));
    }
    loaded.researchArtifactSchema = readJson(schemaPath);
    loaded.registriesVersion = readJson(path.join(dir, "registries_version.json"));
  } catch (error) {
    throw new BaselineError(`unreadable contract baseline: ${error.message}`);
  }

  const roles = loaded.roles.entries ?? [];
  const methods = loaded.methodologies.entries ?? [];
  const profiles = loaded.profiles.entries ?? [];
  const apis = loaded.apis.entries ?? [];
  expectCount("roles", roles.length, 5);
  expectCount("methodologies", methods.length, 31);
  expectCount("profiles", profiles.length, 10);
  expectCount("apis", apis.length, 237);

  const roleIds = roles.map((role) => role.role_id);
  if (roleIds.join(",") !== FIVE_ROLES.join(",")) {
    throw new BaselineError(`roles must be ${FIVE_ROLES.join(",")} in that order`);
  }
  for (const roleId of roleIds) {
    if (FORBIDDEN_ROLES.includes(roleId) || SCOPE_CLASSES.includes(roleId)) {
      throw new BaselineError(`illegal role id ${roleId}`);
    }
  }
  const classes = new Set(methods.map((method) => method.execution_class));
  for (const required of EXECUTION_CLASSES) {
    if (!classes.has(required)) {
      throw new BaselineError(`missing execution class ${required}`);
    }
  }
  for (const api of apis) {
    for (const field of A_FIELDS) {
      if (!(field in api)) {
        throw new BaselineError(`${api.operation_id} missing ${field}`);
      }
    }
    if (!("a23" in api) || !("a24" in api)) {
      throw new BaselineError(`${api.operation_id} missing A23/A24 slot`);
    }
  }
  if (!loaded.researchArtifactSchema.required?.includes("artifact_id")) {
    throw new BaselineError("research artifact schema is not readable");
  }
  const deliveryTypes = new Set((loaded.delivery.entries ?? []).map((entry) => entry.delivery_type));
  for (const mode of DELIVERY_MODES) {
    if (!deliveryTypes.has(mode)) {
      throw new BaselineError(`delivery registry missing ${mode}`);
    }
  }
  assertContractBaseline(root, loaded, methods, apis);

  const byId = {
    role: new Map(roles.map((entry) => [entry.role_id, entry])),
    methodology: new Map(methods.map((entry) => [entry.methodology_id, entry])),
    profile: new Map(profiles.map((entry) => [entry.profile_id, entry])),
    api: new Map(apis.map((entry) => [entry.operation_id, entry])),
    source: new Map((loaded.sources.entries ?? []).map((entry) => [entry.source_id, entry])),
    catalog: new Map((loaded.intelligence_catalog.entries ?? []).map((entry) => [entry.catalog_id, entry])),
    output: new Map((loaded.outputs.entries ?? []).map((entry) => [entry.output_type, entry])),
    delivery: new Map((loaded.delivery.entries ?? []).map((entry) => [entry.delivery_type, entry])),
  };

  return {
    root,
    loaded,
    byId,
    roles,
    methods,
    profiles,
    apis,
    bindings: loaded.bindings,
    dataStates: loaded.data_states,
    pit: loaded.pit,
    outputs: loaded.outputs.entries ?? [],
    sources: loaded.sources.entries ?? [],
    catalog: loaded.intelligence_catalog.entries ?? [],
    researchArtifactSchema: loaded.researchArtifactSchema,
    contractVersion: loaded.registriesVersion.new_version,
    aFields: A_FIELDS,
  };
}
