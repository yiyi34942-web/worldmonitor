import { readFileSync } from "node:fs";
import path from "node:path";
import { classifyCall, classifyEntitlement, resolveContract } from "./runtime.mjs";

const A23_STATUSES = [
  "LIVE_VERIFIED",
  "BLOCKED_AUTH",
  "BLOCKED_ENTITLEMENT",
  "NOT_COVERED",
  "UPSTREAM_UNAVAILABLE",
  "NOT_SAFE_TO_CALL",
  "NOT_APPLICABLE_LIVE",
  "CONTRACT_CONFLICT",
  "FAILED",
];

export function indexOpenApi(yamlText) {
  const index = new Map();
  let route = null;
  let method = null;
  for (const line of yamlText.split("\n")) {
    const pathMatch = line.match(/^ {4}(\/[^:\s]+):\s*$/);
    if (pathMatch) {
      route = pathMatch[1];
      method = null;
      continue;
    }
    const methodMatch = line.match(/^ {8}(get|post|put|patch|delete|head):\s*$/);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
      continue;
    }
    const idMatch = line.match(/^ {12}operationId:\s*["']?([A-Za-z0-9_]+)["']?\s*$/);
    if (idMatch && route) {
      index.set(idMatch[1], { canonical_route: route, http_method: method });
    }
  }
  return index;
}

export function loadOpenApiIndex(root) {
  const filePath = path.join(root, "docs", "api", "worldmonitor.openapi.yaml");
  return indexOpenApi(readFileSync(filePath, "utf8"));
}

function emptyCounts() {
  return Object.fromEntries(A23_STATUSES.map((status) => [status, 0]));
}

/**
 * Live-call acceptance. Writes are not called. Reads are not marked verified
 * unless a real response is returned by the injected fetch.
 */
export async function runA23(registry, options = {}) {
  const env = options.env ?? {};
  const liveEnabled = env.WTILS_A23_LIVE === "1";
  const baseUrl = env.WORLDMONITOR_BASE_URL || "";
  const credential = env.WTILS_API_KEY || "";
  const tier = env.WTILS_ENTITLEMENT_TIER || "standard";
  const openapi = options.openapiIndex ?? null;
  const fetchImpl = options.fetchImpl ?? null;
  const counts = emptyCounts();
  const results = [];

  for (const api of registry.apis) {
    const contract = resolveContract(registry, api.operation_id, openapi);
    const call = classifyCall(api);
    const entitlement = classifyEntitlement(api, "rest", tier);
    let status = "NOT_COVERED";
    let called = false;
    let httpStatus = null;
    const openapiEntry = openapi?.get(api.operation_id) ?? null;
    const covered = openapi ? Boolean(openapiEntry) : true;

    if (contract.status === "CONTRACT_CONFLICT") {
      status = "CONTRACT_CONFLICT";
    } else if (!covered) {
      status = "NOT_COVERED";
    } else if (!call.a23_candidate) {
      status = "NOT_SAFE_TO_CALL";
    } else if (api.authentication === "API_KEY" && !credential) {
      status = "BLOCKED_AUTH";
    } else if (entitlement.status === "BLOCKED_ENTITLEMENT") {
      status = "BLOCKED_ENTITLEMENT";
    } else if (!liveEnabled || !baseUrl) {
      status = "UPSTREAM_UNAVAILABLE";
    } else if (!fetchImpl) {
      status = "UPSTREAM_UNAVAILABLE";
    } else {
      called = true;
      try {
        const url = new URL(api.canonical_route, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
        const response = await fetchImpl(url, {
          method: call.call_class === "SAFE_READ" ? api.http_method : api.http_method,
          headers: credential ? { authorization: "Bearer [redacted]" } : {},
        });
        httpStatus = response?.status ?? null;
        if (response?.ok) status = "LIVE_VERIFIED";
        else if (response?.status === 401 || response?.status === 403) status = "BLOCKED_AUTH";
        else status = "FAILED";
      } catch {
        status = "FAILED";
      }
    }

    counts[status] += 1;
    results.push({
      operation_id: api.operation_id,
      canonical_route: api.canonical_route,
      http_method: api.http_method,
      scope_class: api.scope_class,
      call_class: call.call_class,
      status,
      called,
      http_status: httpStatus,
      entitlement: entitlement.status,
      sandbox: false,
    });
  }

  return {
    policy: {
      live_enabled: liveEnabled,
      writes: "NOT_SAFE_TO_CALL",
      forged_live: false,
    },
    counts,
    total: results.length,
    results,
  };
}

const A24_STATUSES = ["ACCEPTED", "PARTIAL", "BLOCKED", "FAILED"];

/**
 * Acceptance is not HTTP 200. A missing response is BLOCKED.
 */
export function evaluateA24(contract, response) {
  if (!response) {
    return { status: "BLOCKED", checks: [{ name: "response", ok: false, detail: "NO_LIVE_RESPONSE" }] };
  }
  const checks = [];
  const body = response.body ?? null;
  const http = response.status ?? null;
  checks.push({
    name: "http_status_alone",
    ok: true,
    detail: "HTTP status is recorded and is not the acceptance rule",
    http,
  });
  if (body && typeof body === "object" && (body.error || body._jmespath_error)) {
    checks.push({ name: "error_semantics", ok: false, detail: contract.error_semantics ?? "STANDARD_HTTP" });
  } else if (http && http >= 400) {
    checks.push({ name: "error_semantics", ok: false, detail: `HTTP_${http}` });
  } else {
    checks.push({ name: "error_semantics", ok: true, detail: contract.error_semantics ?? "STANDARD_HTTP" });
  }
  const required = response.required_fields ?? [];
  const missing = required.filter((field) => body == null || body[field] === undefined);
  checks.push({ name: "required_fields", ok: missing.length === 0, detail: missing.join(",") || "present" });
  const schemaOk = response.schema_valid !== false;
  checks.push({ name: "schema", ok: schemaOk, detail: schemaOk ? "valid" : "schema_invalid" });
  const zeroViolation = Boolean(body && body.__treat_missing_as_zero);
  checks.push({
    name: "data_state",
    ok: !zeroViolation,
    detail: zeroViolation ? "missing_treated_as_zero" : "missing_distinct_from_zero",
  });
  const freshness = body?.fetchedAt ?? body?.as_of ?? body?.freshness ?? null;
  checks.push({
    name: "freshness_metadata",
    ok: freshness != null || response.freshness_required === false,
    detail: freshness == null ? "absent" : "present",
  });
  const pagination = contract.pagination ?? {};
  if (pagination.supported) {
    const pageOk = body != null && ("nextPageToken" in body || "pagination" in body || Array.isArray(body.items) || Array.isArray(body.results));
    checks.push({ name: "pagination", ok: pageOk, detail: pageOk ? "present" : "missing_page_shape" });
  } else {
    checks.push({ name: "pagination", ok: true, detail: "NOT_APPLICABLE" });
  }
  if (contract.jmespath) {
    const jmesOk = body != null && !body._jmespath_error;
    checks.push({ name: "jmespath", ok: jmesOk, detail: contract.jmespath });
  } else {
    checks.push({ name: "jmespath", ok: true, detail: "NOT_APPLICABLE" });
  }
  const exposed = body?.source ?? body?.delivery ?? null;
  checks.push({
    name: "source_delivery_evidence",
    ok: true,
    detail: exposed ? "exposed" : "not_exposed",
  });
  const failed = checks.some((check) => !check.ok && (check.name === "error_semantics" || check.name === "schema" || check.name === "data_state"));
  const partial = checks.some((check) => !check.ok);
  let status = "ACCEPTED";
  if (failed) status = "FAILED";
  else if (partial) status = "PARTIAL";
  return { status, checks };
}

export function runA24(registry, responses = new Map()) {
  const counts = Object.fromEntries(A24_STATUSES.map((status) => [status, 0]));
  const results = [];
  for (const api of registry.apis) {
    const contract = resolveContract(registry, api.operation_id);
    const evaluation = evaluateA24(contract, responses.get(api.operation_id) ?? null);
    counts[evaluation.status] += 1;
    results.push({
      operation_id: api.operation_id,
      status: evaluation.status,
      checks: evaluation.checks,
    });
  }
  return { counts, total: results.length, results, rule: "HTTP_200_IS_NOT_ACCEPTANCE" };
}
