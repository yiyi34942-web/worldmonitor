# FINAL_TEST_REPORT

Registry validator: python3 wtils/scripts/registries/validate.py
- exit: 0
- valid: true
- error_count: 0
- warning_count: 118

Registry tests: python3 wtils/tests/registries/test_registries.py
- exit: 0
- passed: 152
- failed: 0
- negative_validator_proof_12_mutations: PASS 12/12 mutations caught by real validator

Runtime tests: node --test tests/wtils/phase2a.test.mjs tests/wtils/phase2a-v.test.mjs tests/wtils/phase2a-v2.test.mjs
- exit: 0
- tests: 53
- passed: 53
- failed: 0

The validator file was not modified. The negative proof remains inside the registry suite.
Runtime tests do not require an external inventory file.
