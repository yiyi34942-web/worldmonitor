# FINAL_RUNTIME_VALIDATION

Static baseline: f8d3eb60361db203f33c33e9514abda90dc94b59
Contract version: 2.1.2
Methodology version: 1.2.0

- Roles: 5
- Profiles: 10
- Methodologies: 31
- Canonical APIs: 237
- Profile relations: 85
- Profile bindings: 85
- Role methodology bindings: 100
- request_contract_ref: 237/237
- Request body BOUND: 18
- Request body NOT_APPLICABLE: 219
- Artifact fields: 26
- PIT fields: 13
- Strict schema errors: 0

Runtime reads profile_methodology_bindings and checks them against profile.core_methodologies, triggered_methodologies, and audit_methodologies.
NONCALLABLE and META stay out of the normal API plan. GOVERNANCE stays on the audit trace.
A00-A22 state is the semantic authority. A23 and A24 stay single runtime statuses.
No live write was sent. A23 used an empty environment and did not call fetch.

- contract_version: PASS
- registry_validator: PASS
- registry_tests: PASS
- runtime_tests: PASS
- contract_conflicts: PASS
- five_role_runtime: PASS
- profile_router: PASS
- method_router: PASS
- api_planner: PASS
- method_version_runtime: PASS
- m21_runtime_semantics: PASS
- a_state_runtime: PASS
- delivery_two_axis_runtime: PASS
- request_contract_runtime: PASS
- request_body_runtime: PASS
- source_policy_runtime: PASS
- source_unknown_preserved: PASS
- research_artifact: PASS
- pit_runtime: PASS
- delta_t_runtime: PASS
- revision_runtime: PASS
- hormuz_final_e2e: PASS
- external_gap_default_off: PASS
- nas_absent_degradation: PASS
- air_legacy_runtime_untouched: PASS
- mac_studio_portability: PASS
- fresh_checkout: PASS
- a23_expected: PASS
- a24_blocked: PASS
- ownership: PASS

CONTRACT_CONFLICTS = 0
PRE_HARDWARE_READY = YES
