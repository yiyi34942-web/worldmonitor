#!/usr/bin/env python3
"""WTILS Phase 1 Registry Validator.

Validates all registry files against their schemas, cross-validates references,
and checks for consistency constraints.

FAIL-CLOSED: Unknown references are ERRORS, not warnings.
Only non-contract informational conditions can be warnings.
"""

import json
import os
import sys
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "registries")
RESEARCH_SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "research")
CONFIG_DIR = os.path.join(BASE_DIR, "config", "registries")
PHASE1_DIR = os.path.join(BASE_DIR, "phase1")


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


    # --- Validate provenance_class and execution_class ---
    valid_provenance = {"OFFICIAL", "WTILS_EXTENSION"}
    valid_execution = {"DIRECT_API", "COMPOSITE", "NONCALLABLE", "META", "GOVERNANCE", "UNMAPPED"}
    for m in methods:
        ctx = f"methodology:{m.get('methodology_id', '?')}"
        pc = m.get("provenance_class")
        ec = m.get("execution_class")
        if pc not in valid_provenance:
            errors.append(f"{ctx}: invalid provenance_class '{pc}', must be one of {valid_provenance}")
        if ec not in valid_execution:
            errors.append(f"{ctx}: invalid execution_class '{ec}', must be one of {valid_execution}")
    
    # --- Check C05 execution_class=META and callable=false ---
    c05 = next((m for m in methods if m["methodology_id"] == "C05"), None)
    if c05:
        if c05.get("execution_class") != "META":
            errors.append("methodology:C05: execution_class must be META")
        if c05.get("callable") != False:
            errors.append("methodology:C05: callable must be false")
    
    # --- Check C06/C07 execution_class=GOVERNANCE ---
    for cid in ["C06", "C07"]:
        cm = next((m for m in methods if m["methodology_id"] == cid), None)
        if cm and cm.get("execution_class") != "GOVERNANCE":
            errors.append(f"methodology:{cid}: execution_class must be GOVERNANCE")

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

    # ======================================================================
    # FAIL-CLOSED CROSS-VALIDATION: Unknown references are ERRORS
    # ======================================================================

    # --- Profile referencing unknown API -> ERROR ---
    for pr in profiles:
        for api_ref in pr.get("l0_derived_api_refs", []) + pr.get("l1_fast_api_refs", []) + pr.get("l2_deep_api_refs", []):
            if api_ref not in api_ids:
                errors.append(f"profile:{pr['profile_id']}: references unknown API '{api_ref}' - FAIL-CLOSED")

    # --- Profile referencing unknown Role -> ERROR ---
    for pr in profiles:
        for rid in pr.get("primary_roles", []) + pr.get("secondary_roles", []):
            if rid not in role_ids:
                errors.append(f"profile:{pr['profile_id']}: references unknown role_id '{rid}' - FAIL-CLOSED")
        for cr in pr.get("conditional_roles", []):
            if cr["role"] not in role_ids:
                errors.append(f"profile:{pr['profile_id']}: conditional role '{cr['role']}' not in role registry - FAIL-CLOSED")

    # --- Profile referencing unknown Methodology -> ERROR ---
    for pr in profiles:
        for mid in pr.get("core_methodologies", []) + pr.get("audit_methodologies", []):
            if mid not in method_ids:
                errors.append(f"profile:{pr['profile_id']}: references unknown methodology_id '{mid}' - FAIL-CLOSED")
        for tm in pr.get("triggered_methodologies", []):
            if tm["methodology_id"] not in method_ids:
                errors.append(f"profile:{pr['profile_id']}: triggered methodology '{tm['methodology_id']}' not in methodology registry - FAIL-CLOSED")

    # --- API referencing unknown Role -> ERROR ---
    for a in apis:
        for rid in a.get("role_bindings", []):
            if rid not in role_ids:
                errors.append(f"api:{a['operation_id']}: role_binding '{rid}' not in role registry - FAIL-CLOSED")

    # --- API referencing unknown Methodology -> ERROR ---
    for a in apis:
        for mid in a.get("methodology_bindings", []):
            if mid not in method_ids:
                errors.append(f"api:{a['operation_id']}: methodology_binding '{mid}' not in methodology registry - FAIL-CLOSED")

    # --- API referencing unknown Profile -> ERROR ---
    for a in apis:
        for pid in a.get("profile_bindings", []):
            if pid not in profile_ids:
                errors.append(f"api:{a['operation_id']}: profile_binding '{pid}' not in profile registry - FAIL-CLOSED")

    # --- API referencing unknown Source -> ERROR ---
    for a in apis:
        for sref in a.get("source_refs", []):
            if sref not in source_ids:
                errors.append(f"api:{a['operation_id']}: source_ref '{sref}' not in source registry - FAIL-CLOSED")

    # --- API referencing unknown Delivery -> ERROR ---
    delivery = registries.get("delivery_semantics", {}).get("entries", [])
    delivery_types = {d["delivery_type"] for d in delivery}
    for a in apis:
        dref = a.get("delivery_semantics_ref")
        if dref and dref not in delivery_types:
            errors.append(f"api:{a['operation_id']}: delivery_semantics_ref '{dref}' not in delivery_semantics registry - FAIL-CLOSED")

    # --- Active fast path using retired API -> ERROR ---
    retired_ops = {a["operation_id"] for a in apis if a.get("status") == "RETIRED"}
    for pr in profiles:
        for api_ref in pr.get("l1_fast_api_refs", []):
            if api_ref in retired_ops:
                errors.append(f"profile:{pr['profile_id']}: fast path uses RETIRED API '{api_ref}' - FAIL-CLOSED")

    # --- Bindings cross-validation -> ERROR ---
    bindings = registries.get("bindings", {})
    
    # --- Round 2: Check methods with O-binding are NOT UNMAPPED ---
    bound_method_ids = set()
    for b in bindings.get("methodology_api_bindings", []):
        if b.get("classification") == "O":
            bound_method_ids.add(b.get("methodology_id"))
    for mid in bound_method_ids:
        m = next((x for x in methods if x["methodology_id"] == mid), None)
        if m and m.get("execution_class") == "UNMAPPED":
            errors.append(f"methodology:{mid}: has O-binding but execution_class=UNMAPPED")
    
    # --- Round 2: Check no source has host containing .worldmonitor.dev ---
    for s in sources:
        host = s.get("host") or ""
        if ".worldmonitor.dev" in host:
            errors.append(f"source:{s['source_id']}: host contains '.worldmonitor.dev' (invented): {host}")
    
    # --- Round 2: Check design-owned A-fields (A16/A17/A18) are all VERIFIED ---
    for a in apis:
        ctx = f"api:{a.get('operation_id', '?')}"
        for af in ["a16_role_bound", "a17_methodology_bound", "a18_profile_bound"]:
            val = a.get(af)
            if val != True:
                errors.append(f"{ctx}: {af} must be true (VERIFIED), got {val}")
    
    # profile_methodology_bindings: profile and methodology must exist
    for b in bindings.get("profile_methodology_bindings", []):
        pid = b.get("profile_id")
        mid = b.get("methodology_id")
        if pid and pid not in profile_ids:
            errors.append(f"binding:profile_method: profile_id '{pid}' not in profile registry - FAIL-CLOSED")
        if mid and mid not in method_ids:
            errors.append(f"binding:profile_method: methodology_id '{mid}' not in methodology registry - FAIL-CLOSED")

    # methodology_api_bindings: methodology and API must exist
    for b in bindings.get("methodology_api_bindings", []):
        mid = b.get("methodology_id")
        oid = b.get("operation_id")
        if mid and mid not in method_ids:
            errors.append(f"binding:method_api: methodology_id '{mid}' not in methodology registry - FAIL-CLOSED")
        if oid and oid not in api_ids:
            errors.append(f"binding:method_api: operation_id '{oid}' not in API registry - FAIL-CLOSED")

    # api_source_bindings: API and source must exist
    for b in bindings.get("api_source_bindings", []):
        oid = b.get("operation_id")
        sid = b.get("source_id")
        if oid and oid not in api_ids:
            errors.append(f"binding:api_source: operation_id '{oid}' not in API registry - FAIL-CLOSED")
        if sid and sid not in source_ids:
            errors.append(f"binding:api_source: source_id '{sid}' not in source registry - FAIL-CLOSED")

    # ======================================================================
    # Non-contract informational warnings (these are OK as warnings)
    # ======================================================================

    # --- Check lifecycle: no retired API with active bindings (informational) ---
    for a in apis:
        if a.get("status") == "RETIRED":
            if a.get("role_bindings") or a.get("methodology_bindings") or a.get("profile_bindings"):
                warnings.append(f"api:{a['operation_id']}: RETIRED API still has active bindings")

    # --- Check all active APIs source-bound (informational) ---
    for a in apis:
        if a.get("status") == "ACTIVE" and not a.get("source_refs"):
            warnings.append(f"api:{a['operation_id']}: ACTIVE API has no source_refs")

    # --- Check measured_zero / unavailable ambiguity ---
    data_states = registries.get("data_states", {}).get("entries", [])
    for ds in data_states:
        if ds["state"] == "MEASURED_ZERO":
            if ds.get("numeric_equivalent") != 0:
                errors.append(f"data_state:MEASURED_ZERO must have numeric_equivalent=0, got {ds.get('numeric_equivalent')}")
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
    result = {
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
    
    # --- Generate PROFILE_BINDING_REPORT ---
    generate_profile_binding_report(registries, result)
    generate_method_api_binding_audit(registries, result)
    
    
    # === ROUND 3 CHECKS ===
    
    # B1: Exactly 5 roles, no INFRASTRUCTURE
    role_ids = set(r.get('role_id','') for r in roles)
    frozen_five = {'WORLD','TECH','FINANCE','COMMODITY','ENERGY'}
    if role_ids != frozen_five:
        errors.append(f"ROLE_FIVE: role_ids={role_ids} != frozen_five={frozen_five}")
    if 'INFRASTRUCTURE' in role_ids:
        errors.append("ROLE_INFRASTRUCTURE: INFRASTRUCTURE role must not exist")
    
    # B2: API scope_class and role_binding_mode
    for api in apis:
        op = api.get('operation_id','?')
        scope = api.get('scope_class')
        rbm = api.get('role_binding_mode')
        if scope not in ('ANALYTICAL','SYSTEM','ADMIN','ORCHESTRATION'):
            errors.append(f"API_SCOPE: {op} has invalid scope_class={scope}")
        if rbm not in ('ANALYTICAL_ROLES','NOT_APPLICABLE_SYSTEM'):
            errors.append(f"API_RBM: {op} has invalid role_binding_mode={rbm}")
        if scope == 'ANALYTICAL' and rbm != 'ANALYTICAL_ROLES':
            errors.append(f"API_SCOPE_MISMATCH: {op} is ANALYTICAL but rbm={rbm}")
        if scope != 'ANALYTICAL' and rbm != 'NOT_APPLICABLE_SYSTEM':
            errors.append(f"API_SCOPE_MISMATCH: {op} is {scope} but rbm={rbm}")
        # No INFRASTRUCTURE in role_bindings
        if 'INFRASTRUCTURE' in api.get('role_bindings',[]):
            errors.append(f"API_FAKE_ROLE: {op} uses INFRASTRUCTURE role")
    
    # B4: Methodology execution class checks
    for m in methods:
        mid = m.get('methodology_id','?')
        ec = m.get('execution_class')
        pc = m.get('provenance_class')
        if pc not in ('OFFICIAL','WTILS_EXTENSION'):
            errors.append(f"METH_PROVENANCE: {mid} has invalid provenance_class={pc}")
        if ec not in ('DIRECT_API','COMPOSITE','NONCALLABLE','META','GOVERNANCE','UNMAPPED'):
            errors.append(f"METH_EXEC: {mid} has invalid execution_class={ec}")
    
    # B5: No bare false in A-fields (must use explicit state)
    for api in apis:
        op = api.get('operation_id','?')
        for k,v in api.items():
            if (k.startswith('a0') or k.startswith('a1') or k.startswith('a2')) and v is False:
                errors.append(f"A_FIELD_BARE_FALSE: {op}.{k} is bare false, must use explicit state")
    
    # B4 specific: Methods with O-binding must not be UNMAPPED
    for b in bindings.get("methodology_api_bindings", []):
        if b.get('classification') == 'O':
            mid = b.get('methodology_id')
            for m in methods:
                if m.get('methodology_id') == mid and m.get('execution_class') == 'UNMAPPED':
                    errors.append(f"METH_UNMAPPED_WITH_O: {mid} has O-binding but execution_class=UNMAPPED")

    return result


def generate_profile_binding_report(registries, validation_result):
    """Generate PROFILE_BINDING_REPORT.md with real IDs, no '?' placeholders."""
    profiles = registries.get("profiles", {}).get("entries", [])
    methods = registries.get("methodologies", {}).get("entries", [])
    roles = registries.get("roles", {}).get("entries", [])
    bindings = registries.get("bindings", {})
    
    profile_map = {p["profile_id"]: p for p in profiles}
    method_map = {m["methodology_id"]: m for m in methods}
    role_map = {r["role_id"]: r for r in roles}
    
    lines = ["# Profile Binding Report", ""]
    lines.append("## Profile-Role Bindings")
    lines.append("")
    lines.append("| profile_id | profile_name | role_id | role_name | binding_type | default_prior |")
    lines.append("|---|---|---|---|---|---|")
    
    for b in bindings.get("profile_role_bindings", []):
        pid = b.get("profile_id", "?")
        rid = b.get("role_id", "?")
        bt = b.get("binding_type", "?")
        dp = b.get("default_prior", b.get("weight", "?"))
        pname = profile_map.get(pid, {}).get("name", pid)
        rname = role_map.get(rid, {}).get("name", rid)
        lines.append(f"| {pid} | {pname} | {rid} | {rname} | {bt} | {dp} |")
    
    lines.append("")
    lines.append("## Profile-Methodology Bindings")
    lines.append("")
    lines.append("| profile_id | profile_name | methodology_id | methodology_name | binding_type |")
    lines.append("|---|---|---|---|---|")
    
    for b in bindings.get("profile_methodology_bindings", []):
        pid = b.get("profile_id", "?")
        mid = b.get("methodology_id", "?")
        bt = b.get("binding_type", "?")
        pname = profile_map.get(pid, {}).get("name", pid)
        mname = method_map.get(mid, {}).get("name", mid)
        lines.append(f"| {pid} | {pname} | {mid} | {mname} | {bt} |")
    
    lines.append("")
    
    report_path = os.path.join(PHASE1_DIR, "PROFILE_BINDING_REPORT.md")
    with open(report_path, "w") as f:
        f.write("\n".join(lines))



def generate_method_api_binding_audit(registries, validation_result):
    """Generate METHOD_API_BINDING_AUDIT.md with O/R/E/X/N evidence for each methodology."""
    methods = registries.get("methodologies", {}).get("entries", [])
    bindings = registries.get("bindings", {})
    apis = registries.get("apis", {}).get("entries", [])
    
    method_map = {m["methodology_id"]: m for m in methods}
    api_map = {a["operation_id"]: a for a in apis}
    
    lines = ["# Method-API Binding Audit", ""]
    lines.append("For each methodology, lists bound operations with O/R/E/X/N classification and evidence.")
    lines.append("")
    
    from collections import defaultdict
    method_bindings = defaultdict(list)
    for b in bindings.get("methodology_api_bindings", []):
        method_bindings[b.get("methodology_id")].append(b)
    
    for mid in sorted(method_map.keys()):
        m = method_map[mid]
        lines.append(f"## {mid}: {m['name']}")
        lines.append(f"- provenance_class: {m.get('provenance_class', '?')}")
        lines.append(f"- execution_class: {m.get('execution_class', '?')}")
        lines.append("")
        
        bound = method_bindings.get(mid, [])
        if not bound:
            lines.append("No API bindings.")
        else:
            lines.append("| operation_id | classification | service | http_method |")
            lines.append("|---|---|---|---|---|")
            for b in bound:
                oid = b.get("operation_id", "?")
                cls = b.get("classification", "?")
                api = api_map.get(oid, {})
                svc = api.get("service", "?")
                method = api.get("http_method", "?")
                lines.append(f"| {oid} | {cls} | {svc} | {method} |")
        lines.append("")
    
    report_path = os.path.join(PHASE1_DIR, "METHOD_API_BINDING_AUDIT.md")
    with open(report_path, "w") as f:
        f.write("\n".join(lines))


def main():
    result = collect_errors()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
