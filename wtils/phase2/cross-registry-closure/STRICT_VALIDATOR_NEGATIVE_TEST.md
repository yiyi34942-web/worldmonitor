# Strict Validator Negative Test

Mutated entries that must FAIL:

1. rules_structured = {} (dict instead of array) → FAIL
2. unknown_property added → FAIL (additionalProperties=false)

Both caught by strict validator and test runner.
