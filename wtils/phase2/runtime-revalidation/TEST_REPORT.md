# TEST_REPORT

Command: node --test tests/wtils/phase2a.test.mjs tests/wtils/phase2a-v.test.mjs
Exit: 0

✔ runtime_loads_contract_2_1 (2.425959ms)
✔ no_legacy_contract_fields (19.73075ms)
✔ runtime_uses_request_contract_ref (0.173375ms)
✔ runtime_uses_delivery_two_axis (0.140042ms)
✔ runtime_reads_correct_method_semantics (3.040417ms)
✔ M21_not_imo_cii (3.831292ms)
✔ noncallable_not_executed (0.349209ms)
✔ meta_not_executed (0.198667ms)
✔ governance_trace_present (3.06225ms)
✔ research_artifact_full_26_field_contract (3.052125ms)
✔ research_artifact_multi_profile (1.961834ms)
✔ artifact_method_two_axis (1.955333ms)
✔ artifact_source_unknown_preserved (2.689917ms)
✔ artifact_pit_13_fields (2.010917ms)
✔ delta_t_null_when_time_missing (2.4885ms)
✔ revision_append_only_contract (2.756875ms)
✔ Hormuz_v2_1_deterministic (3.635084ms)
✔ NAS_absent_degrades (2.227292ms)
✔ Air_runtime_untouched (276.833666ms)
✔ Mac_Studio_portability (2.3385ms)
✔ registry runtime load (1.821458ms)
✔ five-role enforcement rejects a sixth role and scope classes (0.5155ms)
✔ profile routing preserves explicit profiles and drops unknown ids (0.132125ms)
✔ role router keeps TECH off unless the event trigger is present (0.277666ms)
✔ method routing uses registry ids and does not execute noncallable or meta (0.442542ms)
✔ method API graph keeps composite R edges on L1 and E edges off by default (18.743208ms)
✔ API planner opens L2 only for the declared gates (17.66225ms)
✔ API contract resolver reads the registry operation (0.146125ms)
✔ lifecycle gate drops an inactive operation (1.007459ms)
✔ entitlement classification and call safety (0.899417ms)
✔ error semantics do not treat HTTP 200 as acceptance (0.595541ms)
✔ delivery classification keeps seeded distinct from live (2.37925ms)
✔ source unknown is preserved and same publisher counts once (0.127709ms)
✔ PIT null semantics and no lookahead (0.149375ms)
✔ research artifact validates and output router covers the required kinds (2.2385ms)
✔ external gaps stay off and are not callable (0.406208ms)
✔ Hormuz mock is deterministic (4.076792ms)
✔ NAS absence degrades without throwing (0.170667ms)
✔ mutation endpoints are not live-called (1.813834ms)
✔ default A23 run does not forge live access (0.398791ms)
✔ Mac Studio portability and model endpoints stay unbound (0.430791ms)
ℹ tests 41
ℹ suites 0
ℹ pass 41
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 442.170292
