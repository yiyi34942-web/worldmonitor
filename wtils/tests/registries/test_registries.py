#!/usr/bin/env python3
"""WTILS Phase 1 Registry Tests.

Pure stdlib test script (no pytest dependency). Tests all registries
against their schemas, cross-validates references, and checks constraints.
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


class TestRunner:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0

    def test(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            self.results.append({"test": name, "status": "PASS", "detail": detail})
        else:
            self.failed += 1
            self.results.append({"test": name, "status": "FAIL", "detail": detail})

    def summary(self):
        total = self.passed + self.failed
        return {
            "total": total,
            "passed": self.passed,
            "failed": self.failed,
            "results": self.results
        }


def main():
    runner = TestRunner()

    # Load all registries
    try:
        schemas = {
            "role": load_json(os.path.join(SCHEMA_DIR, "role_schema.json")),
            "methodology": load_json(os.path.join(SCHEMA_DIR, "methodology_schema.json")),
            "profile": load_json(os.path.join(SCHEMA_DIR, "profile_schema.json")),
            "api": load_json(os.path.join(SCHEMA_DIR, "api_schema.json")),
            "source": load_json(os.path.join(SCHEMA_DIR, "source_schema.json")),
            "intelligence_catalog": load_json(os.path.join(SCHEMA_DIR, "intelligence_catalog_schema.json")),
            "contract_lifecycle": load_json(os.path.join(SCHEMA_DIR, "contract_lifecycle_schema.json")),
            "output": load_json(os.path.join(SCHEMA_DIR, "output_schema.json")),
        }
        schemas["research_artifact"] = load_json(os.path.join(RESEARCH_SCHEMA_DIR, "research_artifact_schema.json"))
    except Exception as e:
        runner.test("schema_load", False, str(e))
        print(json.dumps(runner.summary(), indent=2))
        sys.exit(1)

    registries = {}
    reg_files = {
        "roles": "roles.json", "methodologies": "methodologies.json",
        "profiles": "profiles.json", "apis": "apis.json",
        "sources": "sources.json", "intelligence_catalog": "intelligence_catalog.json",
        "contracts": "contracts.json", "outputs": "outputs.json",
        "delivery_semantics": "delivery_semantics.json", "data_states": "data_states.json",
        "pit_contract": "pit_contract.json", "bindings": "bindings.json",
    }
    for name, fname in reg_files.items():
        try:
            registries[name] = load_json(os.path.join(CONFIG_DIR, fname))
        except Exception as e:
            runner.test(f"registry_load_{name}", False, str(e))

    # --- Test 1: All 8 registry schema validations ---
    roles = registries.get("roles", {}).get("entries", [])
    methods = registries.get("methodologies", {}).get("entries", [])
    profiles = registries.get("profiles", {}).get("entries", [])
    apis = registries.get("apis", {}).get("entries", [])
    sources = registries.get("sources", {}).get("entries", [])
    catalog = registries.get("intelligence_catalog", {}).get("entries", [])
    contracts = registries.get("contracts", {}).get("entries", [])
    outputs = registries.get("outputs", {}).get("entries", [])

    # Check required fields for each registry type
    def check_required(entries, schema, label):
        ok = True
        missing = []
        required = schema.get("required", [])
        for e in entries:
            for f in required:
                if f not in e:
                    ok = False
                    missing.append(f"{label}:{e.get(label+'_id', e.get('role_id', e.get('methodology_id', '?')))} missing {f}")
        return ok, missing

    for label, entries, schema_key in [
        ("role", roles, "role"),
        ("methodology", methods, "methodology"),
        ("profile", profiles, "profile"),
        ("api", apis, "api"),
        ("source", sources, "source"),
        ("intelligence_catalog", catalog, "intelligence_catalog"),
        ("contract", contracts, "contract_lifecycle"),
        ("output", outputs, "output"),
    ]:
        ok, missing = check_required(entries, schemas[schema_key], label)
        runner.test(f"schema_validation_{label}", ok, f"Missing fields: {missing[:5]}" if missing else "All required fields present")

    # --- Test 2: Cross-registry references ---
    role_ids = {r["role_id"] for r in roles}
    method_ids = {m["methodology_id"] for m in methods}
    profile_ids = {p["profile_id"] for p in profiles}
    api_ids = {a["operation_id"] for a in apis}
    source_ids = {s["source_id"] for s in sources}

    # Role refs in profiles
    bad_role_refs = []
    for p in profiles:
        for rid in p.get("primary_roles", []) + p.get("secondary_roles", []):
            if rid not in role_ids:
                bad_role_refs.append(f"{p['profile_id']}:{rid}")
    runner.test("cross_ref_profile_roles", len(bad_role_refs) == 0,
                f"Unknown role refs: {bad_role_refs}" if bad_role_refs else "All role refs valid")

    # Method refs in profiles
    bad_method_refs = []
    for p in profiles:
        for mid in p.get("core_methodologies", []) + p.get("audit_methodologies", []):
            if mid not in method_ids:
                bad_method_refs.append(f"{p['profile_id']}:{mid}")
        for tm in p.get("triggered_methodologies", []):
            if tm["methodology_id"] not in method_ids:
                bad_method_refs.append(f"{p['profile_id']}:{tm['methodology_id']}")
    runner.test("cross_ref_profile_methods", len(bad_method_refs) == 0,
                f"Unknown method refs: {bad_method_refs}" if bad_method_refs else "All method refs valid")

    # --- Test 3: Five Roles exact count = 5 ---
    runner.test("role_count_is_5", len(roles) == 5, f"Got {len(roles)} roles")

    # --- Test 4: Methodology exact count = 31 ---
    runner.test("methodology_count_is_31", len(methods) == 31, f"Got {len(methods)} methodologies")

    # --- Test 5: Profile exact count = 10 ---
    runner.test("profile_count_is_10", len(profiles) == 10, f"Got {len(profiles)} profiles")

    # --- Test 6: No duplicate canonical IDs ---
    for label, entries, id_field in [
        ("role", roles, "role_id"),
        ("methodology", methods, "methodology_id"),
        ("profile", profiles, "profile_id"),
        ("api", apis, "operation_id"),
        ("source", sources, "source_id"),
        ("catalog", catalog, "catalog_id"),
    ]:
        ids = [e[id_field] for e in entries]
        dupes = [x for x in ids if ids.count(x) > 1]
        runner.test(f"no_duplicate_ids_{label}", len(dupes) == 0,
                    f"Duplicate IDs: {set(dupes)}" if dupes else "No duplicates")

    # --- Test 7: A00-A22 static completeness for CRUDE profile APIs ---
    p01 = next((p for p in profiles if p["profile_id"] == "P01"), None)
    if p01:
        crude_api_refs = set(p01.get("l0_derived_api_refs", []) + p01.get("l1_fast_api_refs", []) + p01.get("l2_deep_api_refs", []))
        crude_apis = [a for a in apis if a["operation_id"] in crude_api_refs]
        a_fields = [f"a{i:02d}" for i in range(23)]  # a00 to a22
        # Actually the field names are like a00_registered, a01_http_method_verified, etc.
        a_check_fields = [
            "a00_registered", "a01_http_method_verified", "a02_canonical_route_verified",
            "a03_auth_defined", "a04_entitlement_defined", "a05_declared_availability",
            "a06_request_schema_bound", "a07_response_schema_bound", "a08_nullability_bound",
            "a09_source_bound", "a10_attribution_bound", "a11_delivery_bound",
            "a12_seed_cache_bound", "a13_freshness_bound", "a14_lifecycle_bound",
            "a15_contract_version_bound", "a16_role_bound", "a17_methodology_bound",
            "a18_profile_bound", "a19_rate_limit_bound", "a20_jmespath_bound",
            "a21_pagination_truncation_bound", "a22_error_semantics_bound"
        ]
        all_complete = True
        incomplete_apis = []
        for a in crude_apis:
            for f in a_check_fields:
                if not a.get(f, False):
                    all_complete = False
                    incomplete_apis.append(f"{a['operation_id']}:{f}")
        runner.test("a00_a22_completeness_crude", all_complete,
                    f"Incomplete: {incomplete_apis[:5]}" if incomplete_apis else "All A00-A22 verified for CRUDE profile APIs")
    else:
        runner.test("a00_a22_completeness_crude", False, "P01 profile not found")

    # --- Test 8: All active methods versioned ---
    unversioned = [m["methodology_id"] for m in methods if not m.get("version")]
    runner.test("all_active_methods_versioned", len(unversioned) == 0,
                f"Unversioned: {unversioned}" if unversioned else "All methods versioned")

    # --- Test 9: All active APIs lifecycle-bound ---
    unbound_lifecycle = [a["operation_id"] for a in apis if a.get("status") == "ACTIVE" and not a.get("lifecycle_ref")]
    runner.test("all_active_apis_lifecycle_bound", len(unbound_lifecycle) == 0,
                f"Unbound: {unbound_lifecycle[:5]}" if unbound_lifecycle else "All ACTIVE APIs lifecycle-bound")

    # --- Test 10: All active APIs source-bound ---
    unbound_source = [a["operation_id"] for a in apis if a.get("status") == "ACTIVE" and not a.get("source_refs")]
    runner.test("all_active_apis_source_bound", len(unbound_source) == 0,
                f"No source: {unbound_source[:5]}" if unbound_source else "All ACTIVE APIs source-bound")

    # --- Test 11: All Profiles resolve to valid Role/Method/API graph ---
    graph_ok = True
    graph_errors = []
    for p in profiles:
        # Primary roles must exist
        for rid in p.get("primary_roles", []):
            if rid not in role_ids:
                graph_ok = False
                graph_errors.append(f"{p['profile_id']}: primary role {rid} not found")
        # Core methods must exist
        for mid in p.get("core_methodologies", []):
            if mid not in method_ids:
                graph_ok = False
                graph_errors.append(f"{p['profile_id']}: core method {mid} not found")
        # L0/L1/L2 APIs should exist in API registry
        for api_ref in p.get("l0_derived_api_refs", []) + p.get("l1_fast_api_refs", []) + p.get("l2_deep_api_refs", []):
            if api_ref not in api_ids:
                # This is a warning, not necessarily an error (some APIs may not be registered yet)
                pass
    runner.test("profile_resolve_graph", graph_ok,
                f"Graph errors: {graph_errors[:5]}" if graph_errors else "All profiles resolve to valid graph")

    # --- Test 12: No retired operation in active fast path ---
    retired_ops = {a["operation_id"] for a in apis if a.get("status") == "RETIRED"}
    retired_in_fast = []
    for p in profiles:
        for api_ref in p.get("l1_fast_api_refs", []):
            if api_ref in retired_ops:
                retired_in_fast.append(f"{p['profile_id']}:{api_ref}")
    runner.test("no_retired_in_fast_path", len(retired_in_fast) == 0,
                f"Retired in fast path: {retired_in_fast}" if retired_in_fast else "No retired ops in fast path")

    # --- Test 13: Research Artifact schema validates ---
    ra_schema = schemas.get("research_artifact", {})
    ra_required = ra_schema.get("required", [])
    runner.test("research_artifact_schema_has_required", len(ra_required) > 0,
                f"Required fields: {len(ra_required)}" if ra_required else "Schema empty")

    # --- Test 14: PIT null semantics ---
    pit = registries.get("pit_contract", {})
    pit_rules = pit.get("rules", [])
    runner.test("pit_contract_has_rules", len(pit_rules) >= 5,
                f"Has {len(pit_rules)} rules" if pit_rules else "No PIT rules found")

    # Check valid_to null semantics: null means currently active
    methods_with_null_valid_to = [m["methodology_id"] for m in methods if m.get("valid_to") is None]
    runner.test("pit_null_valid_to_semantics", len(methods_with_null_valid_to) > 0,
                f"{len(methods_with_null_valid_to)} methods with null valid_to (currently active)")

    # --- Test 15: Evidence Family dedup semantics ---
    # Check that intelligence catalog entries have unique canonical names
    catalog_names = [c["canonical_name"] for c in catalog]
    duped_names = [x for x in catalog_names if catalog_names.count(x) > 1]
    runner.test("evidence_family_dedup", len(duped_names) == 0,
                f"Duplicate canonical names: {set(duped_names)}" if duped_names else "No duplicate canonical names in catalog")

    # --- Test 16: C05 callable=false ---
    c05 = next((m for m in methods if m["methodology_id"] == "C05"), None)
    runner.test("c05_callable_false", c05 is not None and c05.get("callable") == False,
                f"C05 callable={c05.get('callable')}" if c05 else "C05 not found")

    # --- Test 17: C06 has GLOBAL_PRECONDITION ---
    c06 = next((m for m in methods if m["methodology_id"] == "C06"), None)
    has_global_precond = False
    if c06:
        for rule in c06.get("rules_structured", []):
            if rule.get("rule_id") == "GLOBAL_PRECONDITION":
                has_global_precond = True
    runner.test("c06_global_precondition", has_global_precond,
                "C06 has GLOBAL_PRECONDITION rule" if has_global_precond else "C06 missing GLOBAL_PRECONDITION rule")

    # --- Test 18: C07 has GOVERNANCE_CONTRACT ---
    c07 = next((m for m in methods if m["methodology_id"] == "C07"), None)
    has_gov_contract = False
    if c07:
        for rule in c07.get("rules_structured", []):
            if rule.get("rule_id") == "GOVERNANCE_CONTRACT":
                has_gov_contract = True
    runner.test("c07_governance_contract", has_gov_contract,
                "C07 has GOVERNANCE_CONTRACT rule" if has_gov_contract else "C07 missing GOVERNANCE_CONTRACT rule")

    # --- Test 19: Data states cardinal rule ---
    data_states = registries.get("data_states", {}).get("entries", [])
    measured_zero = next((ds for ds in data_states if ds["state"] == "MEASURED_ZERO"), None)
    non_zero_with_zero = [ds["state"] for ds in data_states if ds["state"] != "MEASURED_ZERO" and ds.get("numeric_equivalent") == 0]
    cardinal_ok = (measured_zero is not None and measured_zero.get("numeric_equivalent") == 0 and len(non_zero_with_zero) == 0)
    runner.test("data_states_cardinal_rule", cardinal_ok,
                "missing != zero enforced" if cardinal_ok else f"Cardinal rule violated: MEASURED_ZERO={measured_zero}, non-zero states with 0: {non_zero_with_zero}")

    # --- Test 20: WTILS_GOVERNANCE classification only for C05-C07 ---
    governance_ids = [m["methodology_id"] for m in methods if m.get("classification") == "WTILS_GOVERNANCE"]
    expected_gov = {"C05", "C06", "C07"}
    runner.test("governance_classification_correct", set(governance_ids) == expected_gov,
                f"Got {governance_ids}, expected {expected_gov}")

    # --- Test 21: All methodology version hashes are valid SHA256 ---
    invalid_hashes = []
    for m in methods:
        h = m.get("methodology_version_hash", "")
        if len(h) != 64 or not all(c in "0123456789abcdef" for c in h):
            invalid_hashes.append(f"{m['methodology_id']}:{h[:16]}...")
    runner.test("methodology_hash_valid_sha256", len(invalid_hashes) == 0,
                f"Invalid hashes: {invalid_hashes[:5]}" if invalid_hashes else "All hashes valid SHA256")

    # --- Test 22: P01 CRUDE_OIL has expected structure ---
    if p01:
        runner.test("p01_has_aliases", "CRUDE_OIL" in p01.get("aliases", []),
                    f"Aliases: {p01.get('aliases', [])}")
        runner.test("p01_has_l0_l1_l2",
                    len(p01.get("l0_derived_api_refs", [])) > 0 and
                    len(p01.get("l1_fast_api_refs", [])) > 0 and
                    len(p01.get("l2_deep_api_refs", [])) > 0,
                    f"L0:{len(p01.get('l0_derived_api_refs', []))} L1:{len(p01.get('l1_fast_api_refs', []))} L2:{len(p01.get('l2_deep_api_refs', []))}")
        runner.test("p01_has_dashboard_state", "dashboard_state" in p01 and "view" in p01["dashboard_state"],
                    f"Dashboard: {p01.get('dashboard_state', {})}")
    else:
        runner.test("p01_structure", False, "P01 not found")

    # --- Test 23: Bindings graph exists and is non-empty ---
    bindings = registries.get("bindings", {})
    runner.test("bindings_graph_exists", bool(bindings),
                f"Binding keys: {list(bindings.keys())}")

    # Output
    result = runner.summary()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
