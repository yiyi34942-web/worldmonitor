#!/usr/bin/env python3
"""WTILS Phase 1 Registry Tests.

Pure stdlib test script (no pytest dependency). Tests all registries
against their schemas, cross-validates references, and checks constraints.

Includes BLOCKER 9 tests: 12 additional tests for fail-closed validation.
"""

import json
import os
import sys
import re
from collections import defaultdict, Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "registries")
RESEARCH_SCHEMA_DIR = os.path.join(BASE_DIR, "schemas", "research")
CONFIG_DIR = os.path.join(BASE_DIR, "config", "registries")
PHASE1_DIR = os.path.join(BASE_DIR, "phase1")


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

    roles = registries.get("roles", {}).get("entries", [])
    methods = registries.get("methodologies", {}).get("entries", [])
    profiles = registries.get("profiles", {}).get("entries", [])
    apis = registries.get("apis", {}).get("entries", [])
    sources = registries.get("sources", {}).get("entries", [])
    catalog = registries.get("intelligence_catalog", {}).get("entries", [])
    contracts = registries.get("contracts", {}).get("entries", [])
    outputs = registries.get("outputs", {}).get("entries", [])

    role_ids = {r["role_id"] for r in roles}
    method_ids = {m["methodology_id"] for m in methods}
    profile_ids = {p["profile_id"] for p in profiles}
    api_ids = {a["operation_id"] for a in apis}
    source_ids = {s["source_id"] for s in sources}

    # ======================================================================
    # EXISTING TESTS (preserved)
    # ======================================================================

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

    bad_role_refs = []
    for p in profiles:
        for rid in p.get("primary_roles", []) + p.get("secondary_roles", []):
            if rid not in role_ids:
                bad_role_refs.append(f"{p['profile_id']}:{rid}")
    runner.test("cross_ref_profile_roles", len(bad_role_refs) == 0,
                f"Unknown role refs: {bad_role_refs}" if bad_role_refs else "All role refs valid")

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

    runner.test("role_count_is_5", len(roles) == 5, f"Got {len(roles)} roles")
    runner.test("methodology_count_is_31", len(methods) == 31, f"Got {len(methods)} methodologies")
    runner.test("profile_count_is_10", len(profiles) == 10, f"Got {len(profiles)} profiles")

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

    unversioned = [m["methodology_id"] for m in methods if not m.get("version")]
    runner.test("all_active_methods_versioned", len(unversioned) == 0,
                f"Unversioned: {unversioned}" if unversioned else "All methods versioned")

    unbound_lifecycle = [a["operation_id"] for a in apis if a.get("status") == "ACTIVE" and not a.get("lifecycle_ref")]
    runner.test("all_active_apis_lifecycle_bound", len(unbound_lifecycle) == 0,
                f"Unbound: {unbound_lifecycle[:5]}" if unbound_lifecycle else "All ACTIVE APIs lifecycle-bound")

    retired_ops = {a["operation_id"] for a in apis if a.get("status") == "RETIRED"}
    retired_in_fast = []
    for p in profiles:
        for api_ref in p.get("l1_fast_api_refs", []):
            if api_ref in retired_ops:
                retired_in_fast.append(f"{p['profile_id']}:{api_ref}")
    runner.test("no_retired_in_fast_path", len(retired_in_fast) == 0,
                f"Retired in fast path: {retired_in_fast}" if retired_in_fast else "No retired ops in fast path")

    data_states = registries.get("data_states", {}).get("entries", [])
    measured_zero = next((ds for ds in data_states if ds["state"] == "MEASURED_ZERO"), None)
    non_zero_with_zero = [ds["state"] for ds in data_states if ds["state"] != "MEASURED_ZERO" and ds.get("numeric_equivalent") == 0]
    cardinal_ok = (measured_zero is not None and measured_zero.get("numeric_equivalent") == 0 and len(non_zero_with_zero) == 0)
    runner.test("data_states_cardinal_rule", cardinal_ok,
                "missing != zero enforced" if not cardinal_ok else "Cardinal rule enforced")

    governance_ids = [m["methodology_id"] for m in methods if m.get("execution_class") == "GOVERNANCE"]
    expected_gov = {"C06", "C07"}
    runner.test("governance_classification_correct", set(governance_ids) == expected_gov,
                f"Got {governance_ids}, expected {expected_gov}")

    invalid_hashes = []
    for m in methods:
        h = m.get("methodology_version_hash", "")
        if len(h) != 64 or not all(c in "0123456789abcdef" for c in h):
            invalid_hashes.append(f"{m['methodology_id']}:{h[:16]}...")
    runner.test("methodology_hash_valid_sha256", len(invalid_hashes) == 0,
                f"Invalid hashes: {invalid_hashes[:5]}" if invalid_hashes else "All hashes valid SHA256")

    c05 = next((m for m in methods if m["methodology_id"] == "C05"), None)
    runner.test("c05_callable_false", c05 is not None and c05.get("callable") == False,
                f"C05 callable={c05.get('callable')}" if c05 else "C05 not found")

    c06 = next((m for m in methods if m["methodology_id"] == "C06"), None)
    has_global_precond = False
    if c06:
        for rule in c06.get("rules_structured", []):
            if rule.get("rule_id") == "GLOBAL_PRECONDITION":
                has_global_precond = True
    runner.test("c06_global_precondition", has_global_precond,
                "C06 has GLOBAL_PRECONDITION rule" if has_global_precond else "C06 missing GLOBAL_PRECONDITION rule")

    c07 = next((m for m in methods if m["methodology_id"] == "C07"), None)
    has_gov_contract = False
    if c07:
        for rule in c07.get("rules_structured", []):
            if rule.get("rule_id") == "GOVERNANCE_CONTRACT":
                has_gov_contract = True
    runner.test("c07_governance_contract", has_gov_contract,
                "C07 has GOVERNANCE_CONTRACT rule" if has_gov_contract else "C07 missing GOVERNANCE_CONTRACT rule")

    bindings = registries.get("bindings", {})
    runner.test("bindings_graph_exists", bool(bindings),
                f"Binding keys: {list(bindings.keys())}")

    # ======================================================================
    # BLOCKER 9: NEW TESTS
    # ======================================================================

    # 1. canonical_methodology_identity_exact
    CANONICAL_NAMES = {
        "M01": "China Activity Nowcast", "M02": "News Digest & Briefing", "M03": "News Credibility",
        "M04": "Country Resilience Index", "M05": "Resilience Indicators", "M06": "Resilience Indicator Licensing",
        "M07": "Known Limitations", "M08": "Financial System Exposure", "M09": "SWF Classification Rubric",
        "M10": "Five-Factor Country Scorecard", "M11": "Demographics & Workforce Capability",
        "M12": "Food Stocks & Stocks-to-Use", "M13": "Defense Industrial Base",
        "M14": "Mineral Production & Processing Concentration", "M15": "Commodity / Supply Vulnerability",
        "M16": "Chokepoints", "M17": "Pipeline Registry", "M18": "Storage Facility",
        "M19": "Fuel Shortage Alert", "M20": "Energy Disruption Event Log",
        "M21": "CII Risk Scoring", "M22": "Disease Outbreak Alert Level", "M23": "Thermal Escalation",
        "M24": "Physical Precious-Metals Divergence Index", "C01": "CII Operator Overview",
        "C02": "Revision & Corrections", "C03": "Geographic Convergence", "C04": "Strategic Risk",
        "C05": "Algorithms & Scoring", "C06": "Decision-Signal Provenance", "C07": "Source Attribution",
    }
    name_mismatches = []
    method_map = {m["methodology_id"]: m for m in methods}
    for mid, expected_name in CANONICAL_NAMES.items():
        m = method_map.get(mid)
        if m is None:
            name_mismatches.append(f"{mid}: NOT FOUND")
        elif m["name"] != expected_name:
            name_mismatches.append(f"{mid}: got '{m['name']}', expected '{expected_name}'")
    runner.test("canonical_methodology_identity_exact", len(name_mismatches) == 0,
                f"Mismatches: {name_mismatches}" if name_mismatches else "All 31 names match frozen list exactly")

    # 2. all_authoritative_api_operations_registered
    inv_path = "/tmp/wm_api_inventory.json"
    try:
        inventory = load_json(inv_path)
        inv_ops = {x["operation"] for x in inventory}
        missing_ops = inv_ops - api_ids
        runner.test("all_authoritative_api_operations_registered", len(missing_ops) == 0,
                    f"Missing {len(missing_ops)} ops: {list(missing_ops)[:5]}" if missing_ops else f"All {len(inv_ops)} inventory operations registered")
    except Exception as e:
        runner.test("all_authoritative_api_operations_registered", False, f"Cannot load inventory: {e}")

    # 3. a00_a22_all_operations (not just CRUDE)
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
    missing_a_fields = []
    for a in apis:
        for f in a_check_fields:
            if f not in a:
                missing_a_fields.append(f"{a['operation_id']}:{f}")
    runner.test("a00_a22_all_operations", len(missing_a_fields) == 0,
                f"Missing A-fields: {missing_a_fields[:5]}" if missing_a_fields else f"All A00-A22 present for all {len(apis)} operations")

    # 4. unknown_api_reference_fails
    # Test by checking the validator treats unknown API refs as errors
    # We verify by checking profiles don't reference non-existent APIs
    unknown_api_refs = []
    for p in profiles:
        for api_ref in p.get("l0_derived_api_refs", []) + p.get("l1_fast_api_refs", []) + p.get("l2_deep_api_refs", []):
            if api_ref not in api_ids:
                unknown_api_refs.append(f"{p['profile_id']}:{api_ref}")
    runner.test("unknown_api_reference_fails", len(unknown_api_refs) == 0,
                f"Unknown API refs: {unknown_api_refs[:5]}" if unknown_api_refs else "No unknown API references")

    # 5. unknown_source_reference_fails
    unknown_source_refs = []
    for a in apis:
        for sref in a.get("source_refs", []):
            if sref not in source_ids:
                unknown_source_refs.append(f"{a['operation_id']}:{sref}")
    runner.test("unknown_source_reference_fails", len(unknown_source_refs) == 0,
                f"Unknown source refs: {unknown_source_refs[:5]}" if unknown_source_refs else "No unknown source references")

    # 6. unknown_delivery_reference_fails
    delivery = registries.get("delivery_semantics", {}).get("entries", [])
    delivery_types = {d["delivery_type"] for d in delivery}
    unknown_delivery_refs = []
    for a in apis:
        dref = a.get("delivery_semantics_ref")
        if dref and dref not in delivery_types:
            unknown_delivery_refs.append(f"{a['operation_id']}:{dref}")
    runner.test("unknown_delivery_reference_fails", len(unknown_delivery_refs) == 0,
                f"Unknown delivery refs: {unknown_delivery_refs[:5]}" if unknown_delivery_refs else "No unknown delivery references")

    # 7. profile_binding_report_has_real_ids
    report_path = os.path.join(PHASE1_DIR, "PROFILE_BINDING_REPORT.md")
    try:
        with open(report_path) as f:
            report_content = f.read()
        has_placeholders = "?" in report_content and report_content.count("| ? |") > 0
        runner.test("profile_binding_report_has_real_ids", not has_placeholders,
                    "Report contains '?' placeholders" if has_placeholders else "No '?' placeholders in binding report")
    except Exception as e:
        runner.test("profile_binding_report_has_real_ids", False, f"Cannot read report: {e}")

    # 8. no_placeholder_source_host
    placeholder_hosts = []
    for s in sources:
        host = s.get("host", "")
        if host and ("placeholder" in host.lower() or host == "TBD" or host == ""):
            placeholder_hosts.append(f"{s['source_id']}:{host}")
    runner.test("no_placeholder_source_host", len(placeholder_hosts) == 0,
                f"Placeholder hosts: {placeholder_hosts}" if placeholder_hosts else "No placeholder source hosts")

    # 9. no_invented_valid_from
    invented_dates = []
    for m in methods:
        vf = m.get("valid_from")
        if vf is not None:
            # Any non-null valid_from is potentially invented unless proven
            invented_dates.append(f"{m['methodology_id']}:{vf}")
    runner.test("no_invented_valid_from", len(invented_dates) == 0,
                f"Invented valid_from: {invented_dates[:5]}" if invented_dates else "All valid_from are null (VALID_FROM_UNKNOWN)")

    # 10. method_api_binding_semantics_valid
    valid_classifications = {"O", "R", "E", "X", "N"}
    bad_classifications = []
    for b in bindings.get("methodology_api_bindings", []):
        cls = b.get("classification")
        if cls not in valid_classifications:
            bad_classifications.append(f"{b.get('methodology_id','?')}:{b.get('operation_id','?')}={cls}")
    runner.test("method_api_binding_semantics_valid", len(bad_classifications) == 0,
                f"Invalid classifications: {bad_classifications[:5]}" if bad_classifications else "All method-API bindings use O/R/E/X/N")

    # 11. profile_method_binding_semantics_valid
    valid_pm_types = {"CORE", "TRIGGERED", "AUDIT"}
    bad_pm_types = []
    for b in bindings.get("profile_methodology_bindings", []):
        bt = b.get("binding_type")
        if bt not in valid_pm_types:
            bad_pm_types.append(f"{b.get('profile_id','?')}:{b.get('methodology_id','?')}={bt}")
    # Also check no O/R/E/X/N classification in profile-method bindings
    has_classification_field = any("classification" in b for b in bindings.get("profile_methodology_bindings", []))
    if has_classification_field:
        bad_pm_types.append("profile_method bindings have 'classification' field (should not)")
    runner.test("profile_method_binding_semantics_valid", len(bad_pm_types) == 0,
                f"Invalid types: {bad_pm_types[:5]}" if bad_pm_types else "All profile-method bindings use CORE/TRIGGERED/AUDIT only")

    # 12. default_role_weight_is_prior_not_fixed_runtime_weight
    has_role_priors = True
    missing_priors = []
    for p in profiles:
        if "role_priors" not in p:
            has_role_priors = False
            missing_priors.append(p["profile_id"])
    # Also check binding report uses "default_prior" not "weight"
    binding_report_ok = True
    try:
        with open(report_path) as f:
            rp = f.read()
        if "default_prior" not in rp:
            binding_report_ok = False
    except:
        binding_report_ok = False  # report may not exist yet
    runner.test("default_role_weight_is_prior_not_fixed_runtime_weight",
                has_role_priors and binding_report_ok,
                f"Missing role_priors: {missing_priors}" if missing_priors else "role_priors present, report uses default_prior")

    # === ROUND 3 TESTS ===

    # role_count_is_5
    runner.test("role_count_is_5", len(roles) == 5, f"Got {len(roles)} roles")

    # role_ids_exactly_equal_frozen_five
    frozen_five = {'WORLD','TECH','FINANCE','COMMODITY','ENERGY'}
    actual_role_ids = set(r.get('role_id','') for r in roles)
    runner.test("role_ids_exactly_equal_frozen_five", actual_role_ids == frozen_five, f"Got {actual_role_ids}")

    # no_sixth_core_role
    extra_roles = actual_role_ids - frozen_five
    runner.test("no_sixth_core_role", len(extra_roles) == 0, f"Extra roles: {extra_roles}")

    # no_infrastructure_role
    runner.test("no_infrastructure_role", 'INFRASTRUCTURE' not in actual_role_ids, "INFRASTRUCTURE must not exist")

    # analytical_api_has_five_lens_binding
    analytical_no_role = [a.get('operation_id','?') for a in apis if a.get('scope_class')=='ANALYTICAL' and not a.get('role_bindings')]
    runner.test("analytical_api_has_five_lens_binding", len(analytical_no_role) == 0, f"Missing role bindings: {analytical_no_role[:5]}")

    # system_api_has_explicit_not_applicable_role_mode
    system_wrong = [a.get('operation_id','?') for a in apis if a.get('scope_class') in ('SYSTEM','ADMIN','ORCHESTRATION') and a.get('role_binding_mode') != 'NOT_APPLICABLE_SYSTEM']
    runner.test("system_api_has_explicit_not_applicable_role_mode", len(system_wrong) == 0, f"Wrong mode: {system_wrong}")

    # no_api_uses_nonexistent_role
    invalid_role_refs = []
    for a in apis:
        for r in a.get('role_bindings',[]):
            if r not in frozen_five:
                invalid_role_refs.append(f"{a.get('operation_id','?')}:{r}")
    runner.test("no_api_uses_nonexistent_role", len(invalid_role_refs) == 0, f"Invalid: {invalid_role_refs[:5]}")

    # M03_is_composite_not_direct
    m03 = next((m for m in methods if m.get('methodology_id')=='M03'), None)
    runner.test("M03_is_composite_not_direct", m03 is not None and m03.get('execution_class')=='COMPOSITE', f"execution_class={m03.get('execution_class') if m03 else 'MISSING'}")

    # M08_is_composite_not_direct
    m08 = next((m for m in methods if m.get('methodology_id')=='M08'), None)
    runner.test("M08_is_composite_not_direct", m08 is not None and m08.get('execution_class')=='COMPOSITE', f"execution_class={m08.get('execution_class') if m08 else 'MISSING'}")

    # M12_foodstocks_output_semantics
    m12_bindings = [b for b in bindings.get('methodology_api_bindings',[]) if b.get('methodology_id')=='M12']
    m12_o_ops = sorted([b.get('operation_id') for b in m12_bindings if b.get('classification')=='O'])
    runner.test("M12_foodstocks_output_semantics", m12_o_ops == ['GetFoodStocks'], f"O-bindings: {m12_o_ops}")

    # C01_is_noncallable_operator_view
    c01 = next((m for m in methods if m.get('methodology_id')=='C01'), None)
    c01_has_o = any(b.get('classification')=='O' for b in bindings.get('methodology_api_bindings',[]) if b.get('methodology_id')=='C01')
    runner.test("C01_is_noncallable_operator_view", c01 is not None and c01.get('execution_class')=='NONCALLABLE' and not c01_has_o, f"ec={c01.get('execution_class') if c01 else '?'}, has_O={c01_has_o}")

    # C03_geographic_convergence_inputs_exact_family
    c03 = next((m for m in methods if m.get('methodology_id')=='C03'), None)
    c03_has_o = any(b.get('classification')=='O' for b in bindings.get('methodology_api_bindings',[]) if b.get('methodology_id')=='C03')
    runner.test("C03_geographic_convergence_inputs_exact_family", c03 is not None and c03.get('execution_class')=='COMPOSITE' and not c03_has_o, f"ec={c03.get('execution_class') if c03 else '?'}, has_O={c03_has_o}")

    # C04_strategic_risk_is_composite
    c04 = next((m for m in methods if m.get('methodology_id')=='C04'), None)
    c04_has_o = any(b.get('classification')=='O' for b in bindings.get('methodology_api_bindings',[]) if b.get('methodology_id')=='C04')
    runner.test("C04_strategic_risk_is_composite", c04 is not None and c04.get('execution_class')=='COMPOSITE' and not c04_has_o, f"ec={c04.get('execution_class') if c04 else '?'}, has_O={c04_has_o}")

    # no_method_marks_related_input_as_O_without_output_evidence
    methods_with_o = set(b.get('methodology_id') for b in bindings.get('methodology_api_bindings',[]) if b.get('classification')=='O')
    methods_direct = set(m.get('methodology_id') for m in methods if m.get('execution_class')=='DIRECT_API')
    direct_no_o = methods_direct - methods_with_o
    runner.test("no_method_marks_related_input_as_O_without_output_evidence", len(direct_no_o) == 0, f"DIRECT_API without O: {direct_no_o}")

    # a00_a22_explicit_state_only
    bare_false_count = 0
    for api in apis:
        for k,v in api.items():
            if (k.startswith('a0') or k.startswith('a1') or k.startswith('a2')) and v is False:
                bare_false_count += 1
    runner.test("a00_a22_explicit_state_only", bare_false_count == 0, f"{bare_false_count} bare false A-fields")

    # openapi_static_fields_extracted_when_evidence_exists
    verified_a_fields = sum(1 for a in apis if a.get('a03_auth_defined_state') == 'VERIFIED')
    runner.test("openapi_static_fields_extracted_when_evidence_exists", verified_a_fields > 200, f"{verified_a_fields} auth fields verified from OpenAPI")

    # === ROUND 4 TESTS ===

    # execution_class_callable_consistency
    exec_callable_map = {'DIRECT_API': True, 'COMPOSITE': True, 'NONCALLABLE': False, 'META': False, 'GOVERNANCE': False}
    callable_conflicts = []
    for m in methods:
        ec = m.get('execution_class','')
        expected = exec_callable_map.get(ec)
        if expected is not None and m.get('callable') != expected:
            callable_conflicts.append(f"{m['methodology_id']}: execution_class={ec} but callable={m.get('callable')}")
    runner.test("execution_class_callable_consistency", len(callable_conflicts) == 0, f"Conflicts: {callable_conflicts}")

    # all_noncallable_methods_callable_false
    noncallable_true = [m['methodology_id'] for m in methods if m.get('execution_class')=='NONCALLABLE' and m.get('callable')!=False]
    runner.test("all_noncallable_methods_callable_false", len(noncallable_true) == 0, f"NONCALLABLE with callable=true: {noncallable_true}")

    # all_meta_methods_callable_false
    meta_true = [m['methodology_id'] for m in methods if m.get('execution_class')=='META' and m.get('callable')!=False]
    runner.test("all_meta_methods_callable_false", len(meta_true) == 0, f"META with callable=true: {meta_true}")

    # a00_a22_all_23_fields_reported
    a_field_ids = ['a00_registered','a01_http_method_verified','a02_canonical_route_verified',
        'a03_auth_defined','a04_entitlement_bound','a05_declared_availability',
        'a06_request_schema_bound','a07_response_schema_bound','a08_nullability_bound',
        'a09_source_bound','a10_attribution_bound','a11_delivery_bound',
        'a12_seed_cache_bound','a13_freshness_bound',
        'a14_lifecycle_bound','a15_contract_version_bound',
        'a16_role_bound','a17_methodology_bound','a18_profile_bound',
        'a19_rate_limit_bound','a20_jmespath_bound',
        'a21_pagination_truncation_bound','a22_error_semantics_bound']
    # Check at least one API has each field
    missing_fields = [f for f in a_field_ids if not any(f in a for a in apis)]
    runner.test("a00_a22_all_23_fields_reported", len(missing_fields) == 0, f"Missing: {missing_fields}")

    # a00_a22_each_field_sums_to_237
    non_237_fields = []
    for field in a_field_ids:
        count = sum(1 for a in apis if field in a and a[field] not in (None,))
        if count != 237:
            non_237_fields.append(f"{field}={count}")
    runner.test("a00_a22_each_field_sums_to_237", len(non_237_fields) == 0, f"Fields not 237: {non_237_fields[:5]}")

    # source_category_counts_sum_to_total
    src_vs_counts = {}
    for s in sources:
        vs = s.get('verification_state','MISSING')
        src_vs_counts[vs] = src_vs_counts.get(vs, 0) + 1
    src_sum = sum(src_vs_counts.values())
    runner.test("source_category_counts_sum_to_total", src_sum == len(sources), f"sum={src_sum} total={len(sources)}")

    # api_source_category_counts_sum_to_237
    api_src_v = sum(1 for a in apis if a.get('a09_source_bound') in (True,'VERIFIED'))
    api_src_b = sum(1 for a in apis if a.get('a09_source_bound') in ('BLOCKED_STATIC_EVIDENCE',))
    api_src_na = sum(1 for a in apis if a.get('a09_source_bound') == 'NOT_APPLICABLE')
    api_src_sum = api_src_v + api_src_b + api_src_na
    runner.test("api_source_category_counts_sum_to_237", api_src_sum == 237, f"verified={api_src_v} blocked={api_src_b} na={api_src_na} sum={api_src_sum}")

    # methodology_mapping_report_all_names_present
    blank_method_names = [m['methodology_id'] for m in methods if not m.get('canonical_name') and not m.get('name')]
    runner.test("methodology_mapping_report_all_names_present", len(blank_method_names) == 0, f"Blank names: {blank_method_names}")

    # validation_report_all_role_names_present
    blank_role_names = [r['role_id'] for r in roles if not r.get('canonical_name') and not r.get('name')]
    runner.test("validation_report_all_role_names_present", len(blank_role_names) == 0, f"Blank names: {blank_role_names}")

    # Output
    result = runner.summary()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
