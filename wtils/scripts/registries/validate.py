#!/usr/bin/env python3
"""WTILS Phase 1 Registry Validator.

Validates all registry files against their schemas, cross-validates references,
and checks for consistency constraints.
"""

import json
import os
import sys
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "registries")
RESEARCH_SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "research")
CONFIG_DIR = os.path.join(BASE_DIR, "config", "registries")


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def collect_errors():
    errors = []
    warnings = []

    # --- Load schemas ---
    schemas = {}
    schema_files = {
        "role": "role_schema.json",
        "methodology": "methodology_schema.json",
        "profile": "profile_schema.json",
        "api": "api_schema.json",
        "source": "source_schema.json",
        "intelligence_catalog": "intelligence_catalog_schema.json",
        "contract_lifecycle": "contract_lifecycle_schema.json",
        "output": "output_schema.json",
    }
    for name, fname in schema_files.items():
        path = os.path.join(SCHEMA_DIR, fname)
        try:
            schemas[name] = load_json(path)
        except Exception as e:
            errors.append(f"CRITICAL: Cannot load schema {fname}: {e}")

    research_schema_path = os.path.join(RESEARCH_SCHEMA_DIR, "research_artifact_schema.json")
    try:
        schemas["research_artifact"] = load_json(research_schema_path)
    except Exception as e:
        errors.append(f"CRITICAL: Cannot load research artifact schema: {e}")

    # --- Load registries ---
    registries = {}
    registry_files = {
        "roles": "roles.json",
        "methodologies": "methodologies.json",
        "profiles": "profiles.json",
        "apis": "apis.json",
        "sources": "sources.json",
        "intelligence_catalog": "intelligence_catalog.json",
        "contracts": "contracts.json",
        "outputs": "outputs.json",
        "delivery_semantics": "delivery_semantics.json",
        "data_states": "data_states.json",
        "pit_contract": "pit_contract.json",
        "bindings": "bindings.json",
    }
    for name, fname in registry_files.items():
        path = os.path.join(CONFIG_DIR, fname)
        try:
            registries[name] = load_json(path)
        except Exception as e:
            errors.append(f"CRITICAL: Cannot load registry {fname}: {e}")

    if errors:
        return {"valid": False, "errors": errors, "warnings": warnings}

    # --- Validate required fields per schema ---
    def validate_required(entry, schema, context):
        local_errors = []
        required = schema.get("required", [])
        props = schema.get("properties", {})
        for field in required:
            if field not in entry:
                local_errors.append(f"{context}: missing required field '{field}'")
            elif entry[field] is None and props.get(field, {}).get("nullable", True) is False:
                local_errors.append(f"{context}: field '{field}' must not be null")
        return local_errors

    def validate_enum(entry, schema, context):
        local_errors = []
        props = schema.get("properties", {})
        for field, prop in props.items():
            if field in entry and "enum" in prop:
                if entry[field] not in prop["enum"]:
                    local_errors.append(f"{context}: field '{field}' value '{entry[field]}' not in enum {prop['enum']}")
        return local_errors

    def validate_type(entry, schema, context):
        local_errors = []
        props = schema.get("properties", {})
        type_map = {"string": str, "boolean": bool, "integer": int, "number": (int, float), "array": list, "object": dict}
        for field, prop in props.items():
            if field in entry and entry[field] is not None:
                expected = prop.get("type")
                if expected and isinstance(expected, str) and expected in type_map:
                    if not isinstance(entry[field], type_map[expected]):
                        local_errors.append(f"{context}: field '{field}' expected type {expected}, got {type(entry[field]).__name__}")
        return local_errors

    # --- Validate roles ---
    roles = registries.get("roles", {}).get("entries", [])
    role_ids = set()
    for r in roles:
        ctx = f"role:{r.get('role_id', '?')}"
        errors.extend(validate_required(r, schemas["role"], ctx))
        errors.extend(validate_enum(r, schemas["role"], ctx))
        if r["role_id"] in role_ids:
            errors.append(f"{ctx}: duplicate role_id {r['role_id']}")
        role_ids.add(r["role_id"])

    # --- Validate methodologies ---
    methods = registries.get("methodologies", {}).get("entries", [])
    method_ids = set()
    for m in methods:
        ctx = f"methodology:{m.get('methodology_id', '?')}"
        errors.extend(validate_required(m, schemas["methodology"], ctx))
        errors.extend(validate_enum(m, schemas["methodology"], ctx))
        if m["methodology_id"] in method_ids:
            errors.append(f"{ctx}: duplicate methodology_id {m['methodology_id']}")
        method_ids.add(m["methodology_id"])
        # Check callable constraint
        if m["methodology_id"] == "C05" and m.get("callable", True) != False:
            errors.append(f"{ctx}: C05 must have callable=false (META type)")
        # Check hash length
        h = m.get("methodology_version_hash", "")
        if len(h) != 64:
            errors.append(f"{ctx}: methodology_version_hash must be 64 hex chars, got {len(h)}")

    # --- Validate profiles ---
    profiles = registries.get("profiles", {}).get("entries", [])
    profile_ids = set()
    for pr in profiles:
        ctx = f"profile:{pr.get('profile_id', '?')}"
        errors.extend(validate_required(pr, schemas["profile"], ctx))
        errors.extend(validate_enum(pr, schemas["profile"], ctx))
        if pr["profile_id"] in profile_ids:
            errors.append(f"{ctx}: duplicate profile_id {pr['profile_id']}")
        profile_ids.add(pr["profile_id"])

    # --- Validate APIs ---
    apis = registries.get("apis", {}).get("entries", [])
    api_ids = set()
    for a in apis:
        ctx = f"api:{a.get('operation_id', '?')}"
        errors.extend(validate_required(a, schemas["api"], ctx))
        errors.extend(validate_enum(a, schemas["api"], ctx))
        if a["operation_id"] in api_ids:
            errors.append(f"{ctx}: duplicate operation_id {a['operation_id']}")
        api_ids.add(a["operation_id"])

    # --- Validate sources ---
    sources = registries.get("sources", {}).get("entries", [])
    source_ids = set()
    for s in sources:
        ctx = f"source:{s.get('source_id', '?')}"
        errors.extend(validate_required(s, schemas["source"], ctx))
        errors.extend(validate_enum(s, schemas["source"], ctx))
        if s["source_id"] in source_ids:
            errors.append(f"{ctx}: duplicate source_id {s['source_id']}")
        source_ids.add(s["source_id"])

    # --- Validate intelligence catalog ---
    catalog = registries.get("intelligence_catalog", {}).get("entries", [])
    catalog_ids = set()
    for c in catalog:
        ctx = f"catalog:{c.get('catalog_id', '?')}"
        errors.extend(validate_required(c, schemas["intelligence_catalog"], ctx))
        if c["catalog_id"] in catalog_ids:
            errors.append(f"{ctx}: duplicate catalog_id {c['catalog_id']}")
        catalog_ids.add(c["catalog_id"])

    # --- Validate contracts ---
    contracts = registries.get("contracts", {}).get("entries", [])
    contract_ids = set()
    for cl in contracts:
        ctx = f"contract:{cl.get('contract_id', '?')}"
        errors.extend(validate_required(cl, schemas["contract_lifecycle"], ctx))
        errors.extend(validate_enum(cl, schemas["contract_lifecycle"], ctx))
        if cl["contract_id"] in contract_ids:
            errors.append(f"{ctx}: duplicate contract_id {cl['contract_id']}")
        contract_ids.add(cl["contract_id"])

    # --- Validate outputs ---
    outputs = registries.get("outputs", {}).get("entries", [])
    output_ids = set()
    for o in outputs:
        ctx = f"output:{o.get('output_type', '?')}"
        errors.extend(validate_required(o, schemas["output"], ctx))
        if o["output_type"] in output_ids:
            errors.append(f"{ctx}: duplicate output_type {o['output_type']}")
        output_ids.add(o["output_type"])

    # --- Cross-validation: role IDs in profiles exist ---
    for pr in profiles:
        for rid in pr.get("primary_roles", []) + pr.get("secondary_roles", []):
            if rid not in role_ids:
                errors.append(f"profile:{pr['profile_id']}: references unknown role_id '{rid}'")
        for cr in pr.get("conditional_roles", []):
            if cr["role"] not in role_ids:
                errors.append(f"profile:{pr['profile_id']}: conditional role '{cr['role']}' not in role registry")

    # --- Cross-validation: methodology IDs in profiles exist ---
    for pr in profiles:
        for mid in pr.get("core_methodologies", []) + pr.get("audit_methodologies", []):
            if mid not in method_ids:
                errors.append(f"profile:{pr['profile_id']}: references unknown methodology_id '{mid}'")
        for tm in pr.get("triggered_methodologies", []):
            if tm["methodology_id"] not in method_ids:
                errors.append(f"profile:{pr['profile_id']}: triggered methodology '{tm['methodology_id']}' not in methodology registry")

    # --- Cross-validation: API operation IDs in profiles exist ---
    for pr in profiles:
        for api_ref in pr.get("l0_derived_api_refs", []) + pr.get("l1_fast_api_refs", []) + pr.get("l2_deep_api_refs", []):
            if api_ref not in api_ids:
                warnings.append(f"profile:{pr['profile_id']}: API ref '{api_ref}' not found in api registry (may be from unregistered service)")

    # --- Cross-validation: role/methodology bindings in APIs exist ---
    for a in apis:
        for rid in a.get("role_bindings", []):
            if rid not in role_ids:
                warnings.append(f"api:{a['operation_id']}: role_binding '{rid}' not in role registry")
        for mid in a.get("methodology_bindings", []):
            if mid not in method_ids:
                warnings.append(f"api:{a['operation_id']}: methodology_binding '{mid}' not in methodology registry")
        for pid in a.get("profile_bindings", []):
            if pid not in profile_ids:
                warnings.append(f"api:{a['operation_id']}: profile_binding '{pid}' not in profile registry")

    # --- Cross-validation: source refs in APIs exist ---
    for a in apis:
        for sref in a.get("source_refs", []):
            if sref not in source_ids:
                warnings.append(f"api:{a['operation_id']}: source_ref '{sref}' not in source registry")

    # --- Check lifecycle: no retired API in active binding ---
    for a in apis:
        if a.get("status") == "RETIRED":
            if a.get("role_bindings") or a.get("methodology_bindings") or a.get("profile_bindings"):
                warnings.append(f"api:{a['operation_id']}: RETIRED API still has active bindings")

    # --- Check measured_zero / unavailable ambiguity ---
    data_states = registries.get("data_states", {}).get("entries", [])
    measured_zero_ok = True
    for ds in data_states:
        if ds["state"] == "MEASURED_ZERO":
            if ds.get("numeric_equivalent") != 0:
                errors.append(f"data_state:MEASURED_ZERO must have numeric_equivalent=0, got {ds.get('numeric_equivalent')}")
                measured_zero_ok = False
        elif ds.get("numeric_equivalent") is not None and ds["state"] != "MEASURED_ZERO":
            if ds["numeric_equivalent"] == 0:
                errors.append(f"data_state:{ds['state']}: only MEASURED_ZERO may have numeric_equivalent=0")

    # --- Check all active methods versioned ---
    for m in methods:
        if not m.get("version"):
            errors.append(f"methodology:{m['methodology_id']}: active methodology missing version")

    # --- Check all active APIs lifecycle-bound ---
    for a in apis:
        if a.get("status") == "ACTIVE" and not a.get("lifecycle_ref"):
            errors.append(f"api:{a['operation_id']}: ACTIVE API missing lifecycle_ref")

    # --- Check all active APIs source-bound ---
    for a in apis:
        if a.get("status") == "ACTIVE" and not a.get("source_refs"):
            warnings.append(f"api:{a['operation_id']}: ACTIVE API has no source_refs")

    # --- Validate delivery semantics ---
    delivery = registries.get("delivery_semantics", {}).get("entries", [])
    delivery_types = {d["delivery_type"] for d in delivery}
    for a in apis:
        dref = a.get("delivery_semantics_ref")
        if dref and dref not in delivery_types:
            warnings.append(f"api:{a['operation_id']}: delivery_semantics_ref '{dref}' not in delivery_semantics registry")

    # --- Validate data states ---
    ds_states = {ds["state"] for ds in data_states}
    expected_states = {"AVAILABLE", "MEASURED_ZERO", "NOT_COVERED", "NO_DATA", "SEED_MISSING",
                       "CACHE_UNAVAILABLE", "UPSTREAM_UNAVAILABLE", "INVALID_REQUEST",
                       "ENTITLEMENT_REQUIRED", "RETIRED", "COVERAGE_UNKNOWN"}
    missing_states = expected_states - ds_states
    if missing_states:
        errors.append(f"data_states: missing expected states: {missing_states}")

    # --- Summary ---
    valid = len(errors) == 0
    return {
        "valid": valid,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "counts": {
            "roles": len(roles),
            "methodologies": len(methods),
            "profiles": len(profiles),
            "apis": len(apis),
            "sources": len(sources),
            "intelligence_catalog": len(catalog),
            "contracts": len(contracts),
            "outputs": len(outputs),
            "delivery_semantics": len(delivery),
            "data_states": len(data_states),
        }
    }


def main():
    result = collect_errors()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
