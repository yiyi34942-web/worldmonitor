# RUNTIME_V2_1_VALIDATION

Contract baseline: df11ca6e1a15a4dd6b11be320bd0c42d59f79988
Contract version: 2.1.0

- Roles: 5
- Methodologies: 31
- API operations: 237
- request_contract_ref: 237/237
- Artifact fields: 26
- PIT fields: 13
- Research store: JUSTIFIED / UNBOUND

Schema-structural errors excluding unbound delivery enums: 0
Delivery enum schema errors retained as conflicts: 46

Runtime gates:

- Method routing uses canonical name, provenance class, execution class, and bindings.
- NONCALLABLE and META stay out of the API plan.
- C06 and C07 are governance traces.
- Artifact uses primary_profile_id and profile_ids.
- Sources keep nulls and UNKNOWN.
- Missing PIT timestamps stay null.
- delta_t duration_ms is null when a timestamp is missing.
- revision is an append-only object.

A23 LIVE_VERIFIED 0, BLOCKED_AUTH 225, NOT_SAFE_TO_CALL 12, OTHER 0
A24 ACCEPTED 0, PARTIAL 0, BLOCKED 237, FAILED 0
Air names/volumes/ports unchanged: YES
Portability findings: 0
Tests exit: 0

Registry files were not modified.
