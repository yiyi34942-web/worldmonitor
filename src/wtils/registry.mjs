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
  constructor(message) {
    super(message);
    this.name = "BaselineError";
    this.code = "STOP_AND_REPORT_MISSING_PHASE1_BASELINE";
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
  } catch (error) {
    throw new BaselineError(`unreadable Phase 1 baseline: ${error.message}`);
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
    aFields: A_FIELDS,
  };
}
