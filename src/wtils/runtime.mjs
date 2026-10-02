import { createHash } from "node:crypto";
import {
  DELIVERY_MODES,
  FIVE_ROLES,
  FORBIDDEN_ROLES,
  OBSERVATION_TIMESTAMPS,
  SCOPE_CLASSES,
} from "./registry.mjs";

const CALLABLE = new Set(["DIRECT_API", "COMPOSITE"]);
const NOT_TOOLS = new Set(["NONCALLABLE", "META"]);

export const EXTERNAL_GAPS = Object.freeze([
  {
    gap_type: "EVIDENCE_GAP",
    providers: ["apify", "original_full_text"],
    default_enabled: false,
  },
  {
    gap_type: "MARKET_PRECISION_GAP",
    providers: ["exchange", "tick", "l2"],
    default_enabled: false,
  },
  {
    gap_type: "RESEARCH_DOCUMENT_GAP",
    providers: ["reports", "pdfs"],
    default_enabled: false,
  },
  {
    gap_type: "REASONING_GAP",
    providers: ["deeply", "specialist_model"],
    default_enabled: false,
  },
]);

const LEVEL_BY_CLASS = Object.freeze({ O: "L0", R: "L1", E: "L2" });

const INPUT_KINDS = new Set([
  "prompt",
  "signal",
  "hotspot",
  "monitor",
  "webhook",
  "schedule",
]);

export function storagePolicy(env = {}) {
  const present = String(env.NAS_PRESENT ?? "false").toLowerCase() === "true";
  if (!present) {
    return {
      nas_present: false,
      hardware: "UNBOUND",
      realtime: "CONTINUE",
      research_persistence: "QUEUED",
      knowledge_promotion: "BLOCKED_STORAGE",
      large_snapshot: "DEFERRED",
      adapters: ["memory", "queued", "local-dev"],
    };
  }
  return {
    nas_present: true,
    hardware: "BOUND",
    realtime: "CONTINUE",
    research_persistence: "NAS",
    knowledge_promotion: "ALLOWED",
    large_snapshot: "NAS",
  };
}

export function createPersistenceAdapter(kind, options = {}) {
  if (kind === "memory") {
    const records = [];
    return {
      kind,
      save(artifact) {
        records.push(structuredClone(artifact));
        return { state: "MEMORY", stored: true, id: artifact.artifact_id };
      },
      list() {
        return records.map((record) => structuredClone(record));
      },
    };
  }
  if (kind === "unconfigured") {
    return {
      kind,
      save() {
        return { state: "QUEUED", stored: false, id: null };
      },
      list() {
        return [];
      },
    };
  }
  if (kind === "local-dev") {
    return {
      kind,
      root: options.root ?? null,
      save(artifact) {
        if (!options.root) {
          return { state: "QUEUED", stored: false, id: artifact.artifact_id };
        }
        return { state: "LOCAL_DEV", stored: false, id: artifact.artifact_id, root: options.root };
      },
      list() {
        return [];
      },
    };
  }
  throw new Error(`unknown persistence adapter ${kind}`);
}

export function externalGapCatalog() {
  return EXTERNAL_GAPS.map((gap) => ({
    ...gap,
    enabled: false,
    call() {
      throw new Error("EXTERNAL_GAP_DEFAULT_OFF");
    },
  }));
}

export function blankTimestamps(provided = {}) {
  const out = {};
  for (const field of OBSERVATION_TIMESTAMPS) {
    const value = provided[field];
    out[field] = value === undefined || value === "" ? null : value;
  }
  return out;
}

export function applyPit(timestamps, asOf) {
  const raw = blankTimestamps(timestamps);
  if (raw.original_publish_time && raw.wm_first_seen_time === raw.original_publish_time && timestamps.wm_first_seen_time === undefined) {
    raw.wm_first_seen_time = null;
  }
  const usable = {};
  const excluded = [];
  for (const field of OBSERVATION_TIMESTAMPS) {
    const value = raw[field];
    if (value && asOf && Date.parse(value) > Date.parse(asOf)) {
      usable[field] = null;
      excluded.push({ field, value, reason: "NO_LOOKAHEAD" });
    } else {
      usable[field] = value;
    }
  }
  if (usable.wm_first_seen_time && usable.original_publish_time && usable.wm_first_seen_time === usable.original_publish_time && timestamps.wm_first_seen_time === undefined) {
    usable.wm_first_seen_time = null;
  }
  return { timestamps: usable, excluded };
}

export function resolveInput(input = {}) {
  const kind = INPUT_KINDS.has(input.kind) ? input.kind : "prompt";
  return {
    kind,
    text: String(input.text ?? input.query ?? ""),
    payload: input.payload ?? {},
    as_of: input.as_of ?? null,
    priority: input.priority === "high" ? "high" : "normal",
    deep: input.deep === true,
    research_request: input.research_request === true,
    evidence_insufficient: input.evidence_insufficient === true,
    contradiction: input.contradiction === true,
    explicit_profiles: [...(input.explicit_profiles ?? [])],
    explicit_roles: [...(input.explicit_roles ?? [])],
    explicit_methodologies: [...(input.explicit_methodologies ?? [])],
    triggers: [...(input.triggers ?? [])],
    event_id: input.event_id ?? null,
    intent: input.intent ?? kind,
    market_reaction: input.market_reaction ?? [],
    timestamps: input.timestamps ?? {},
  };
}

export function resolveCatalog(registry, resolvedInput) {
  const haystack = `${resolvedInput.text} ${JSON.stringify(resolvedInput.payload)}`.toLowerCase();
  const matches = [];
  for (const entry of registry.catalog) {
    const names = [entry.canonical_name, entry.catalog_id, ...(entry.aliases ?? [])];
    const hit = names.some((name) => name && haystack.includes(String(name).toLowerCase()));
    if (hit) matches.push(entry);
  }
  matches.sort((a, b) => a.catalog_id.localeCompare(b.catalog_id));
  return { matches, catalog_ids: matches.map((entry) => entry.catalog_id) };
}

export function routeProfiles(registry, resolvedInput, catalogResult) {
  const unknown = [];
  const ordered = [];
  const push = (profileId) => {
    if (!profileId || ordered.includes(profileId)) return;
    if (!registry.byId.profile.has(profileId)) {
      unknown.push(profileId);
      return;
    }
    ordered.push(profileId);
  };
  for (const profileId of resolvedInput.explicit_profiles) push(profileId);
  if (ordered.length === 0) {
    for (const entry of catalogResult.matches) {
      for (const profileId of entry.profiles ?? []) push(profileId);
    }
  }
  return {
    profile_ids: ordered,
    profiles: ordered.map((id) => registry.byId.profile.get(id)),
    unknown,
  };
}

export function routeRoles(registry, resolvedInput, profileRoute) {
  const rejected = [];
  const active = new Set();
  const requested = resolvedInput.explicit_roles;
  const triggers = new Set(resolvedInput.triggers.map((item) => String(item).toLowerCase()));
  if (requested.length > 0) {
    for (const roleId of requested) {
      if (FORBIDDEN_ROLES.includes(roleId) || SCOPE_CLASSES.includes(roleId) || !FIVE_ROLES.includes(roleId)) {
        rejected.push({ role_id: roleId, reason: "NOT_A_ROLE" });
        continue;
      }
      active.add(roleId);
    }
  } else {
    for (const profile of profileRoute.profiles) {
      for (const roleId of [...(profile.primary_roles ?? []), ...(profile.secondary_roles ?? [])]) {
        if (FIVE_ROLES.includes(roleId)) active.add(roleId);
      }
      for (const conditional of profile.conditional_roles ?? []) {
        const condition = String(conditional.condition ?? "").toLowerCase();
        if (condition && triggers.has(condition) && FIVE_ROLES.includes(conditional.role)) {
          active.add(conditional.role);
        }
      }
    }
  }
  if (!triggers.has("ai_supply_chain_disruption") && !requested.includes("TECH")) {
    active.delete("TECH");
  }
  const weights = {};
  for (const roleId of FIVE_ROLES) weights[roleId] = 0;
  const profiles = profileRoute.profiles;
  if (profiles.length > 0) {
    for (const profile of profiles) {
      for (const [roleId, weight] of Object.entries(profile.role_priors ?? {})) {
        if (active.has(roleId)) weights[roleId] += Number(weight) || 0;
      }
    }
    for (const roleId of active) {
      if (weights[roleId] === 0) weights[roleId] = 1;
    }
  }
  const sum = [...active].reduce((total, roleId) => total + weights[roleId], 0);
  const roleWeights = {};
  for (const roleId of active) {
    roleWeights[roleId] = sum === 0 ? 0 : Number((weights[roleId] / sum).toFixed(6));
  }
  return {
    roles: FIVE_ROLES.filter((roleId) => active.has(roleId)),
    role_weights: roleWeights,
    rejected,
    tech_default: "OFF",
  };
}

/**
 * Routing identity comes from the registry record's canonical name,
 * provenance class, and execution class. Narrative payload fields are not copied.
 */
export function methodSemanticView(method) {
  return {
    methodology_id: method.methodology_id,
    canonical_name: method.canonical_name ?? method.name ?? null,
    provenance_class: method.provenance_class ?? null,
    execution_class: method.execution_class ?? null,
    methodology_version: method.methodology_version ?? method.version ?? null,
    methodology_version_hash: method.methodology_version_hash ?? null,
    callable: method.callable === true && CALLABLE.has(method.execution_class),
    payload_authority: "NOT_USED_FOR_ROUTING",
  };
}

export function routeMethodologies(registry, resolvedInput, profileRoute) {
  const unknown = [];
  const selectedIds = [];
  const push = (methodologyId) => {
    if (!methodologyId || selectedIds.includes(methodologyId)) return;
    if (!registry.byId.methodology.has(methodologyId)) {
      unknown.push(methodologyId);
      return;
    }
    selectedIds.push(methodologyId);
  };
  if (resolvedInput.explicit_methodologies.length > 0) {
    for (const methodologyId of resolvedInput.explicit_methodologies) push(methodologyId);
  } else {
    const triggers = new Set(resolvedInput.triggers);
    for (const profile of profileRoute.profiles) {
      for (const methodologyId of profile.core_methodologies ?? []) push(methodologyId);
      for (const triggered of profile.triggered_methodologies ?? []) {
        if (triggers.has(triggered.trigger)) push(triggered.methodology_id);
      }
    }
  }
  const governance = [];
  for (const profile of profileRoute.profiles) {
    for (const methodologyId of profile.audit_methodologies ?? []) {
      const method = registry.byId.methodology.get(methodologyId);
      if (method?.execution_class === "GOVERNANCE" && !governance.some((item) => item.methodology_id === methodologyId)) {
        governance.push(traceMethod(method, "GOVERNANCE_GATE"));
      }
    }
  }
  const traces = selectedIds.map((methodologyId) => {
    const method = registry.byId.methodology.get(methodologyId);
    if (NOT_TOOLS.has(method.execution_class)) {
      return traceMethod(method, method.execution_class);
    }
    if (method.execution_class === "GOVERNANCE") {
      return traceMethod(method, "GOVERNANCE_GATE");
    }
    return traceMethod(method, "CALLABLE");
  });
  return { traces, governance, unknown, selected_ids: selectedIds };
}

function traceMethod(method, disposition) {
  const semantic = methodSemanticView(method);
  const executed = disposition === "CALLABLE" && semantic.callable;
  let traceState = "NOT_EXECUTED";
  if (disposition === "GOVERNANCE_GATE") traceState = "GOVERNANCE_TRACE";
  else if (executed) traceState = "EXECUTED";
  return {
    methodology_id: semantic.methodology_id,
    name: semantic.canonical_name,
    version: semantic.methodology_version,
    methodology_version: semantic.methodology_version,
    version_hash: semantic.methodology_version_hash,
    provenance_class: semantic.provenance_class,
    execution_class: semantic.execution_class,
    callable: semantic.callable,
    disposition,
    trace_state: traceState,
    executed,
    semantic_authority: semantic.payload_authority,
  };
}

export function levelGate(resolvedInput) {
  const l2 =
    resolvedInput.priority === "high" ||
    resolvedInput.deep === true ||
    resolvedInput.evidence_insufficient === true ||
    resolvedInput.contradiction === true ||
    resolvedInput.research_request === true;
  return { L0: true, L1: true, L2: l2, L3: false };
}

export function planApis(registry, resolvedInput, methodologyRoute) {
  const gate = levelGate(resolvedInput);
  const bindings = registry.bindings.methodology_api_bindings ?? [];
  const operations = [];
  const seen = new Set();
  for (const trace of methodologyRoute.traces) {
    if (!trace.executed) continue;
    const related = bindings.filter((binding) => binding.methodology_id === trace.methodology_id);
    for (const binding of related) {
      const level = LEVEL_BY_CLASS[binding.classification];
      const api = registry.byId.api.get(binding.operation_id);
      if (!api || !level) continue;
      const key = `${trace.methodology_id}:${binding.operation_id}:${binding.classification}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lifecycle = api.lifecycle_ref ?? null;
      const lifecycleOpen = lifecycle === "ACTIVE";
      const levelOpen = gate[level] === true;
      let blockReason = null;
      if (!lifecycleOpen) blockReason = "LIFECYCLE_GATE";
      else if (!levelOpen) blockReason = "LEVEL_GATE";
      operations.push({
        methodology_id: trace.methodology_id,
        operation_id: binding.operation_id,
        classification: binding.classification,
        level,
        service: api.service,
        http_method: api.http_method,
        canonical_route: api.canonical_route,
        contract_version: api.contract_version,
        scope_class: api.scope_class,
        role_binding_mode: api.role_binding_mode,
        lifecycle_ref: lifecycle,
        lifecycle_open: lifecycleOpen,
        included: lifecycleOpen && levelOpen,
        block_reason: blockReason,
      });
    }
  }
  operations.sort((a, b) =>
    `${a.level}:${a.methodology_id}:${a.operation_id}`.localeCompare(
      `${b.level}:${b.methodology_id}:${b.operation_id}`,
    ),
  );
  return {
    gate,
    operations,
    included: operations.filter((operation) => operation.included),
    external_gaps: externalGapCatalog(),
    l3: "OFF",
  };
}

export function resolveContract(registry, operationId, openapiIndex = null) {
  const api = registry.byId.api.get(operationId);
  if (!api) {
    return { operation_id: operationId, status: "CONTRACT_CONFLICT", conflicts: [{ field: "operation_id", reason: "MISSING" }] };
  }
  const openapi = openapiIndex?.get(operationId) ?? null;
  const requestContractRef = typeof api.request_contract_ref === "string" && api.request_contract_ref.length > 0
    ? api.request_contract_ref
    : null;
  const hasBody = ["POST", "PUT", "PATCH"].includes(String(api.http_method || "").toUpperCase());
  const requestBodySchemaRef = hasBody ? (api.request_body_schema_ref ?? null) : null;
  const requestResolved = requestContractRef
    ? "REQUEST_CONTRACT_REF"
    : openapi
      ? "OPENAPI_OPERATION"
      : "UNRESOLVED";
  const responseResolved = api.response_schema_ref
    ? "REGISTRY_REF"
    : openapi
      ? "OPENAPI_OPERATION"
      : "UNRESOLVED";
  const conflicts = [];
  if (!api.canonical_route || !api.http_method) {
    conflicts.push({ field: "canonical_route", reason: "MISSING_ROUTE", blocking: true });
  }
  if (!requestContractRef) {
    conflicts.push({ field: "request_contract_ref", reason: "UNRESOLVED", blocking: false });
  }
  if (hasBody && !requestBodySchemaRef) {
    conflicts.push({ field: "request_body_schema_ref", reason: "BODY_SCHEMA_UNBOUND", blocking: false });
  }
  for (const roleId of api.role_bindings ?? []) {
    if (!FIVE_ROLES.includes(roleId)) {
      conflicts.push({ field: "role_bindings", current_value: roleId, reason: "ROLE_OUTSIDE_FIVE", blocking: true });
    }
  }
  const blocking = conflicts.some((conflict) => conflict.blocking === true);
  return {
    operation_id: api.operation_id,
    status: blocking ? "CONTRACT_CONFLICT" : "RESOLVED",
    canonical_route: api.canonical_route,
    http_method: api.http_method,
    contract_version: api.contract_version ?? null,
    auth: api.authentication ?? null,
    entitlement: api.entitlement ?? null,
    request_contract_ref: requestContractRef,
    request_body_schema_ref: requestBodySchemaRef,
    request_resolved_from: requestResolved,
    response_schema: { ref: api.response_schema_ref ?? null, resolved_from: responseResolved },
    jmespath: api.jmespath ?? null,
    pagination: api.pagination ?? null,
    error_semantics: api.error_semantics ?? null,
    lifecycle: api.lifecycle_ref ?? null,
    roles: api.role_bindings ?? [],
    role_binding_mode: api.role_binding_mode ?? null,
    scope_class: api.scope_class ?? null,
    methodologies: api.methodology_bindings ?? [],
    profiles: api.profile_bindings ?? [],
    source_state: api.a09_source_bound ?? null,
    delivery_state: api.a11_delivery_bound ?? null,
    primary_delivery_mode: api.primary_delivery_mode ?? null,
    cache_semantics: api.cache_semantics ?? null,
    freshness_ref: api.freshness_ref ?? null,
    seed_state: api.a12_seed_cache_bound ?? null,
    rate_limit: api.rate_limit ?? null,
    openapi_present: Boolean(openapi),
    conflicts,
  };
}

export function resolveDelivery(registry, operationId) {
  const api = registry.byId.api.get(operationId);
  const primary = api?.primary_delivery_mode ?? null;
  const cache = api?.cache_semantics ?? null;
  const seeded = primary === "SEED" || primary === "SEEDED";
  const cached = cache === "CACHED_FETCH";
  return {
    operation_id: operationId,
    primary_delivery_mode: primary,
    cache_semantics: cache,
    known: primary == null || DELIVERY_MODES.includes(primary) || primary === "SEED",
    seeded,
    cached,
    live_observation: (primary === "REQUEST" || primary === "RELAY") && !seeded && !cached,
  };
}

export function resolveSources(registry, sourceIds, observedAt = null) {
  const records = [];
  for (const sourceId of sourceIds) {
    const source = registry.byId.source.get(sourceId);
    if (!source) {
      records.push({
        source_id: sourceId,
        original_publisher: null,
        observer: null,
        provider: null,
        host: null,
        transport: null,
        collector: null,
        observed_at: observedAt,
        state: "UNKNOWN",
      });
      continue;
    }
    records.push({
      source_id: source.source_id,
      original_publisher: source.original_publisher ?? source.publisher_name ?? null,
      observer: source.observer ?? null,
      provider: source.provider ?? source.provider_name ?? null,
      host: source.host ?? null,
      transport: source.transport ?? null,
      collector: source.collector ?? null,
      observed_at: observedAt,
      state: source.verification_state ?? "UNKNOWN",
    });
  }
  return lineage(records);
}

export function lineage(records) {
  const groups = new Map();
  for (const record of records) {
    const publisher = record.original_publisher;
    const key = publisher ? `pub:${publisher}` : `unknown:${record.source_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        original_publisher: publisher,
        transports: [],
        transport_timestamps: [],
      });
    }
    const group = groups.get(key);
    if (record.transport && !group.transports.includes(record.transport)) {
      group.transports.push(record.transport);
    }
    group.transport_timestamps.push({
      source_id: record.source_id,
      transport: record.transport ?? null,
      observed_at: record.observed_at ?? null,
    });
  }
  return {
    records,
    groups: [...groups.values()],
    independent_evidence_count: groups.size,
  };
}

export function sourceIdsForMethods(registry, methodologyIds) {
  const ids = [];
  for (const methodologyId of methodologyIds) {
    const method = registry.byId.methodology.get(methodologyId);
    for (const sourceId of method?.source_requirements ?? []) {
      if (!ids.includes(sourceId)) ids.push(sourceId);
    }
  }
  return ids;
}

const WRITE_PREFIX = /^(Create|Update|Delete|Import|Set|Record|Run|Trigger|Submit|Register)/;
const SAFE_POST_PREFIX = /^(Get|List|Search|Summarize)/;

export function classifyCall(api) {
  const name = api.operation_id;
  const method = String(api.http_method || "").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return { call_class: "SAFE_READ", a23_candidate: true };
  }
  if (method === "POST" && SAFE_POST_PREFIX.test(name)) {
    return { call_class: "SAFE_IDEMPOTENT", a23_candidate: true };
  }
  if (/Webhook|Contact|Interest/i.test(name)) {
    return { call_class: "EXTERNAL_NOTIFICATION", a23_candidate: false };
  }
  if (WRITE_PREFIX.test(name) || method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    return { call_class: "WRITE_SIDE_EFFECT", a23_candidate: false };
  }
  return { call_class: "WRITE_SIDE_EFFECT", a23_candidate: false };
}

export function classifyEntitlement(api, channel = "rest", tier = "standard") {
  const entitlement = api.entitlement ?? {};
  const allowed = entitlement[channel] ?? [];
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return { status: "BLOCKED_ENTITLEMENT", channel, tier, allowed };
  }
  if (!allowed.includes(tier)) {
    return { status: "BLOCKED_ENTITLEMENT", channel, tier, allowed };
  }
  return { status: "ENTITLED", channel, tier, allowed };
}

export function buildResearchResult(registry, input) {
  const resolvedInput = resolveInput(input);
  const catalogResult = resolveCatalog(registry, resolvedInput);
  const profileRoute = routeProfiles(registry, resolvedInput, catalogResult);
  const roleRoute = routeRoles(registry, resolvedInput, profileRoute);
  const methodologyRoute = routeMethodologies(registry, resolvedInput, profileRoute);
  const apiPlan = planApis(registry, resolvedInput, methodologyRoute);
  const pit = applyPit(resolvedInput.timestamps, resolvedInput.as_of);
  const contracts = apiPlan.included.map((operation) => resolveContract(registry, operation.operation_id));
  const deliveries = apiPlan.included.map((operation) => {
    const delivery = resolveDelivery(registry, operation.operation_id);
    return {
      ...delivery,
      as_of: resolvedInput.as_of,
      retrieved_at: null,
      called_at: null,
      cache_state: delivery.cached ? "CACHED_NOT_LIVE" : null,
      seed_state: delivery.seeded ? "SEEDED_NOT_LIVE" : null,
      freshness_state: registry.byId.api.get(operation.operation_id)?.freshness_ref ?? null,
      live_observation: false,
    };
  });
  const executedIds = methodologyRoute.traces.filter((trace) => trace.executed).map((trace) => trace.methodology_id);
  const sources = resolveSources(registry, sourceIdsForMethods(registry, executedIds), null);
  const storage = storagePolicy(input.env ?? {});
  return {
    event: {
      event_id: resolvedInput.event_id,
      query: resolvedInput.text,
      intent: resolvedInput.intent,
      kind: resolvedInput.kind,
    },
    catalog: catalogResult,
    profiles: profileRoute,
    roles: roleRoute,
    methodologies: methodologyRoute,
    api_plan: apiPlan,
    contracts,
    delivery: deliveries,
    sources,
    as_of: resolvedInput.as_of,
    timeline: pit,
    market_reaction: resolvedInput.market_reaction,
    storage,
    unknowns: [
      ...profileRoute.unknown.map((id) => `unknown_profile:${id}`),
      ...methodologyRoute.unknown.map((id) => `unknown_methodology:${id}`),
      ...sources.records.filter((record) => record.host == null).map((record) => `source_host_unknown:${record.source_id}`),
    ],
    contradictions: resolvedInput.contradiction ? [{ claim_a: "input_contradiction", claim_b: "unresolved", resolution: "UNRESOLVED" }] : [],
  };
}

function evidenceRecord(observation, sourceRef) {
  return { observation, claim: observation, source_ref: sourceRef, confidence: 1 };
}

export function buildDeltaT(timestamps) {
  const pairs = [
    ["event_time", "original_publish_time"],
    ["original_publish_time", "wm_first_seen_time"],
    ["original_publish_time", "source_observed_time"],
    ["wm_first_seen_time", "normalized_time"],
    ["methodology_started_time", "methodology_completed_time"],
    ["event_time", "market_first_reaction_time"],
    ["event_time", "outcome_time"],
  ];
  return pairs.map(([fromEvent, toEvent]) => {
    const fromTime = timestamps?.[fromEvent] ?? null;
    const toTime = timestamps?.[toEvent] ?? null;
    if (!fromTime || !toTime) {
      return {
        from_event: fromEvent,
        to_event: toEvent,
        from_time: fromTime,
        to_time: toTime,
        duration_ms: null,
        basis: "not_computable",
        confidence: null,
      };
    }
    const duration = Date.parse(toTime) - Date.parse(fromTime);
    if (!Number.isFinite(duration)) {
      return {
        from_event: fromEvent,
        to_event: toEvent,
        from_time: fromTime,
        to_time: toTime,
        duration_ms: null,
        basis: "not_computable",
        confidence: null,
      };
    }
    return {
      from_event: fromEvent,
      to_event: toEvent,
      from_time: fromTime,
      to_time: toTime,
      duration_ms: duration,
      basis: "observed_timestamps",
      confidence: 1,
    };
  });
}

function methodArtifactItem(trace) {
  return {
    id: trace.methodology_id,
    version: trace.methodology_version ?? trace.version,
    provenance_class: trace.provenance_class,
    execution_class: trace.execution_class,
    methodology_version_hash: trace.version_hash,
    trace_state: trace.trace_state,
  };
}

function apiArtifactItem(registry, operation) {
  const api = registry.byId.api.get(operation.operation_id);
  const call = classifyCall(api);
  return {
    service: api.service,
    operation: api.operation_id,
    contract_version: api.contract_version,
    request_contract_ref: api.request_contract_ref,
    called_at: null,
    primary_delivery_mode: api.primary_delivery_mode ?? null,
    cache_semantics: api.cache_semantics ?? null,
    a23_state: call.a23_candidate ? "BLOCKED_AUTH" : "NOT_SAFE_TO_CALL",
    a24_state: "BLOCKED",
    live_observation: false,
  };
}

export function buildResearchArtifact(registry, result, options = {}) {
  const profileIds = [...new Set(result.profiles.profile_ids)];
  const primary = profileIds[0] ?? null;
  const asOf = result.as_of ?? options.as_of;
  const createdAt = options.created_at ?? asOf;
  const pit = {};
  for (const field of OBSERVATION_TIMESTAMPS) {
    pit[field] = result.timeline.timestamps[field] ?? null;
  }
  const timeline = [];
  for (const field of OBSERVATION_TIMESTAMPS) {
    if (pit[field]) timeline.push({ ts: pit[field], event: field });
  }
  const schemaSources = result.sources.records.map((record) => ({
    publisher: record.original_publisher ?? null,
    provider: record.provider ?? null,
    host: record.host ?? null,
    transport: record.transport ?? null,
    verification_state: record.state ?? "UNKNOWN",
  }));
  const methodSeen = new Set();
  const methodologies = [];
  for (const trace of [...result.methodologies.traces, ...result.methodologies.governance]) {
    if (methodSeen.has(trace.methodology_id)) continue;
    methodSeen.add(trace.methodology_id);
    methodologies.push(methodArtifactItem(trace));
  }
  const apis = result.api_plan.included.map((operation) => apiArtifactItem(registry, operation));
  const evidence = [
    evidenceRecord(`primary_profile ${primary}`, "profile_router"),
    ...profileIds.slice(1).map((profileId) => evidenceRecord(`resolved_profile ${profileId}`, "profile_router")),
    ...result.contracts.map((contract) =>
      evidenceRecord(
        `contract ${contract.operation_id} ${contract.contract_version ?? ""} ${contract.http_method} ${contract.canonical_route} delivery ${contract.primary_delivery_mode ?? "UNBOUND"} ${contract.cache_semantics ?? "UNBOUND"}`.replace(/\s+/g, " ").trim(),
        "contract_resolver",
      ),
    ),
    ...result.methodologies.governance.map((gate) =>
      evidenceRecord(`governance gate ${gate.methodology_id} trace only`, "methodology_router"),
    ),
  ];
  const knownHosts = result.sources.records.filter((record) => record.host).length;
  const confidence = result.sources.records.length === 0
    ? 0
    : Number((knownHosts / result.sources.records.length).toFixed(4));
  const revision = options.revision && typeof options.revision === "object"
    ? options.revision
    : {
        revision_number: 0,
        previous_revision_ref: null,
        revision_reason: "initial",
        created_at: createdAt,
        revision_created_at: createdAt,
      };
  return {
    artifact_id: options.artifact_id ?? "RA_UNNAMED",
    artifact_version: options.artifact_version ?? "2.1.0",
    event_id: result.event.event_id ?? null,
    created_at: createdAt,
    as_of_time: asOf,
    query: result.event.query || null,
    intent: result.event.intent || null,
    primary_profile_id: primary,
    profile_ids: profileIds,
    roles: result.roles.roles,
    role_weights: result.roles.role_weights,
    methodologies,
    apis,
    sources: schemaSources,
    pit,
    timeline,
    evidence,
    contradictions: result.contradictions,
    unknowns: result.unknowns.map((item) => (typeof item === "string" ? { code: item, verification_state: "UNKNOWN" } : item)),
    market_reaction: result.market_reaction ?? [],
    delta_t: options.delta_t ?? buildDeltaT(pit),
    replay: { supported: Boolean(asOf), as_of_field: asOf ? "as_of_time" : null },
    backtest: { available: false, period: null },
    confidence,
    promotion_status: options.promotion_status ?? "DRAFT",
    revision,
  };
}

export function appendRevision(artifact, reason, createdAt) {
  const next = structuredClone(artifact);
  const previousNumber = artifact.revision?.revision_number ?? 0;
  next.revision = {
    revision_number: previousNumber + 1,
    previous_revision_ref: `${artifact.artifact_id}#r${previousNumber}`,
    revision_reason: reason,
    created_at: createdAt,
    revision_created_at: createdAt,
  };
  return { previous: artifact, next };
}

export function validateResearchArtifact(artifact, schema) {
  const errors = [];
  checkNode(artifact, schema, "$", errors);
  return { ok: errors.length === 0, errors };
}

function checkNode(value, schema, pointer, errors) {
  if (!schema || typeof schema !== "object") return;
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${pointer} expected object`);
      return;
    }
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${pointer}.${key} required`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!schema.properties?.[key]) errors.push(`${pointer}.${key} additional`);
      }
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in value) checkNode(value[key], child, `${pointer}.${key}`, errors);
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${pointer} expected array`);
      return;
    }
    value.forEach((item, index) => checkNode(item, schema.items, `${pointer}[${index}]`, errors));
    return;
  }
  if (Array.isArray(schema.type)) {
    const ok = schema.type.some((typeName) => typeOk(value, typeName));
    if (!ok) errors.push(`${pointer} type`);
    return;
  }
  if (schema.type && !typeOk(value, schema.type)) {
    errors.push(`${pointer} expected ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${pointer} enum`);
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${pointer} pattern`);
  }
  if (schema.format === "date-time" && typeof value === "string" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    errors.push(`${pointer} date-time`);
  }
  if (typeof schema.minimum === "number" && typeof value === "number" && value < schema.minimum) {
    errors.push(`${pointer} minimum`);
  }
  if (typeof schema.maximum === "number" && typeof value === "number" && value > schema.maximum) {
    errors.push(`${pointer} maximum`);
  }
}

function typeOk(value, typeName) {
  if (typeName === "null") return value === null;
  if (typeName === "string") return typeof value === "string";
  if (typeName === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeName === "integer") return Number.isInteger(value);
  if (typeName === "boolean") return typeof value === "boolean";
  if (typeName === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (typeName === "array") return Array.isArray(value);
  return true;
}

const IMPLEMENTED_OUTPUTS = new Set(["LIVE_REPORT", "DASHBOARD_STATE", "RESEARCH_ARTIFACT"]);
const STUB_OUTPUTS = new Set([
  "ALERT",
  "WATCH_STATE",
  "BACKTEST_ARTIFACT",
  "KNOWLEDGE_PACKAGE",
  "CURRICULUM_PACKAGE",
  "TRAINING_SAMPLE",
]);

export function routeOutput(registry, result, artifact, outputType) {
  const declared = registry.byId.output.get(outputType);
  if (!declared) return { output_type: outputType, status: "UNKNOWN_OUTPUT" };
  if (STUB_OUTPUTS.has(outputType)) {
    return {
      output_type: outputType,
      status: "STUB",
      destination: declared.destination,
      adapter: "phase2a_stub",
    };
  }
  if (outputType === "LIVE_REPORT") {
    return {
      output_type: outputType,
      status: "READY",
      destination: declared.destination,
      title: result.event.query,
      as_of: result.as_of,
      profiles: result.profiles.profile_ids,
      roles: result.roles.roles,
      sections: result.methodologies.traces.filter((trace) => trace.executed).map((trace) => ({
        methodology_id: trace.methodology_id,
        name: trace.name,
        version: trace.version,
      })),
    };
  }
  if (outputType === "DASHBOARD_STATE") {
    return {
      output_type: outputType,
      status: "READY",
      destination: declared.destination,
      host: "WORLDMONITOR_DASHBOARD",
      panels: result.profiles.profile_ids.map((profileId) => ({
        profile_id: profileId,
        state: "PROJECTED",
      })),
      watch: result.catalog.catalog_ids,
    };
  }
  if (outputType === "RESEARCH_ARTIFACT") {
    return {
      output_type: outputType,
      status: "READY",
      destination: declared.destination,
      artifact,
    };
  }
  return { output_type: outputType, status: IMPLEMENTED_OUTPUTS.has(outputType) ? "READY" : "STUB" };
}

export function routeAllOutputs(registry, result, artifact) {
  const types = registry.outputs.map((output) => output.output_type);
  return types.map((outputType) => routeOutput(registry, result, artifact, outputType));
}

export const UI_INTEGRATION = Object.freeze({
  host: "WORLDMONITOR_DASHBOARD",
  phase2a_ui_edits: "NONE",
  forbidden_surfaces: Object.freeze([
    "SECOND_DASHBOARD",
    "STANDALONE_WTILS_SITE",
    "REACT_STANDALONE",
    "VUE_STANDALONE",
  ]),
  entry_points: Object.freeze([
    { kind: "PANEL", existing_module: "src/config/panels.ts" },
    { kind: "WIDGET", existing_module: "src/config/panels.ts" },
    { kind: "RESEARCH_REPORT", output_type: "LIVE_REPORT" },
    { kind: "ALERT", output_type: "ALERT" },
    { kind: "WM_ANALYST", existing_panel_id: "chat-analyst" },
  ]),
});

export const AGENT_ADAPTERS = Object.freeze({
  grok_bot: Object.freeze({
    duty: "real-time intelligence / alert / fast report",
    live_call: false,
  }),
  chatgpt_dot: Object.freeze({
    duty: "scheduled briefing / supervisory summary",
    webhook_required_phase2a: false,
  }),
  codex: Object.freeze({
    duty: "engineering agent",
    live_call: false,
  }),
});

export function modelEndpoints(env = {}) {
  return {
    ollama_host: env.OLLAMA_HOST ?? null,
    llm_api_url: env.LLM_API_URL ?? null,
    pinned_path: false,
  };
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function runPipeline(registry, input, options = {}) {
  const result = buildResearchResult(registry, input);
  const artifact = buildResearchArtifact(registry, result, {
    artifact_id: options.artifact_id,
    created_at: options.created_at ?? input.as_of,
    artifact_version: options.artifact_version,
    revision: options.revision,
    promotion_status: options.promotion_status,
  });
  const validation = validateResearchArtifact(artifact, registry.researchArtifactSchema);
  const outputs = routeAllOutputs(registry, result, artifact);
  const persistence = (options.persistence ?? createPersistenceAdapter("memory")).save(artifact);
  return {
    result,
    artifact,
    validation,
    outputs,
    persistence,
    digest: digest({ result, artifact, outputs: outputs.map((output) => output.output_type) }),
  };
}
