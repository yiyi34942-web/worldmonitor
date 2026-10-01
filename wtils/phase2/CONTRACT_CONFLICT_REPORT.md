# CONTRACT_CONFLICT_REPORT

Runtime did not edit `wtils/config/registries` or `wtils/schemas`.

A23 operation status `CONTRACT_CONFLICT`: 0.
The items below are registry gaps. They do not block the other operations.

## apis.*_state_state

- affected operations: 118
- current_value: doubled `_state_state` disagrees with the canonical field on the A08 nullability family
- runtime_evidence: `a08_nullability_bound` and `a08_nullability_bound_state` match; `a08_nullability_bound_state_state` is `BLOCKED_STATIC_EVIDENCE` where the canonical value is `NOT_APPLICABLE`
- expected_value: delete the duplicate keys
- impact: runtime ignores the duplicate suffix
- proposed_correction: DELETE_DUPLICATE_STATE_STATE_KEYS

## methodologies.legacy_classification

- M03: execution_class=COMPOSITE legacy=OFFICIAL_DIRECT
- M05: execution_class=DIRECT_API legacy=UNMAPPED_BLOCKED
- M08: execution_class=COMPOSITE legacy=OFFICIAL_DIRECT
- M09: execution_class=COMPOSITE legacy=OFFICIAL_DIRECT
- M11: execution_class=DIRECT_API legacy=UNMAPPED_BLOCKED
- M22: execution_class=DIRECT_API legacy=UNMAPPED_BLOCKED
- C03: execution_class=COMPOSITE legacy=UNMAPPED_BLOCKED
- C04: execution_class=COMPOSITE legacy=UNMAPPED_BLOCKED

## pit_contract.timestamp_fields

- current_value: contract metadata timestamps (as_of_time, created_at, valid_from, valid_to, introduced_at, changed_at, deprecated_at, retired_at, called_at, ts)
- expected_value: also store the observation lineage fields, nullable
- impact: runtime already stores the observation fields and leaves missing ones null
- proposed_correction: ADD_OBSERVATION_TIMESTAMPS

## research_artifact_schema.profile_id

- current_value: one profile id
- runtime_evidence: Hormuz resolves P10, P01, P02
- expected_value: a profile set
- impact: primary profile is P10; P01 and P02 are evidence claims
- proposed_correction: ALLOW_PROFILE_SET

## apis.request_schema_ref

- current_value: null on 237 operations while a06 is true
- runtime_evidence: OpenAPI operationId coverage is 237/237
- expected_value: pointer at the existing OpenAPI document
- impact: non-blocking; no second API catalog was copied
- proposed_correction: POINTER_TO_EXISTING_OPENAPI

